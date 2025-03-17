import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDeviceData, getUserDevices } from '../api/device'; //important
import './Dashboard.css';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiInfo } from 'react-icons/fi';
import { Tooltip } from '@mui/material';
import { socketService } from '../services/socketService';

function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statsRef, statsInView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  const [historyRef, historyInView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  useEffect(() => {
    const initializeSocket = () => {
      try {
        socketService.connect();
      } catch (err) {
        console.error('Failed to initialize socket:', err);
        setError('Failed to connect to real-time updates');
      }
    };

    initializeSocket();

    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const devicesData = await getUserDevices();
        if (Object.keys(devicesData).length === 0) {
          setError('No devices found. Please register a device first.');
          return;
        }
        
        const formattedDevices = Object.entries(devicesData).map(([id, device]) => ({
          id,
          ...device
        }));
        setDevices(formattedDevices);
        setSelectedDevice(formattedDevices[0].id);
      } catch (err) {
        setError('Failed to fetch devices');
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const response = await getDeviceData(selectedDevice);
        
        const processedData = {
          bpm: response.data?.bpm ?? '--',
          spo2: response.data?.spo2 ?? '--',
          internal_temperature: response.data?.internal_temperature ?? '--',
          motor_state: response.data?.motor_state ?? 0,
          history: response.history || []  // Access history directly from response
        };
        
        setDeviceData(processedData);
        setError('');
      } catch (err) {
        setError('Failed to fetch device data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const handleDeviceUpdate = (data) => {
      if (!data?.data) {
        return;
      }

      const processedData = {
        bpm: data.data.bpm ?? '--',
        spo2: data.data.spo2 ?? '--',
        internal_temperature: data.data.internal_temperature ?? '--',
        motor_state: data.data.motor_state ?? 0,
        history: data.history || deviceData.history || []
      };

      setDeviceData(processedData);
    };

    socketService.subscribeToDevice(selectedDevice, handleDeviceUpdate);

    return () => {
      socketService.unsubscribeFromDevice(selectedDevice);
    };
  }, [selectedDevice]);

  const DeviceSelector = ({ devices, selectedDevice, onDeviceChange }) => {
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const selectedDeviceData = devices.find(d => d.id === selectedDevice);
    
    return (
      <div className="device-selector-container">
        <select
          className="device-selector"
          value={selectedDevice || ''}
          onChange={(e) => onDeviceChange(e.target.value)}
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name || `Device ${device.id.slice(-6)}`}
            </option>
          ))}
        </select>
        <Tooltip 
          open={tooltipOpen}
          onOpen={() => setTooltipOpen(true)}
          onClose={() => setTooltipOpen(false)}
          title={
            <div className="device-tooltip">
              <p>MAC: {selectedDevice}</p>
            </div>
          }
        >
          <div className="info-icon">
            <FiInfo />
          </div>
        </Tooltip>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">{error}</div>;
  if (!devices.length) return <div>No devices available</div>;

  return (
    <div className="dashboard">
      <div className="container">
        <DeviceSelector devices={devices} selectedDevice={selectedDevice} onDeviceChange={setSelectedDevice} />
        <motion.div 
          className="dashboard-header"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1 variants={itemVariants}>Device Dashboard</motion.h1>
          <motion.div variants={itemVariants}>
            <Link to="/device-settings" className="settings-button">
              Device Settings
            </Link>
          </motion.div>
        </motion.div>

        <motion.div 
          className="stats-grid"
          ref={statsRef}
          initial="hidden"
          animate={statsInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {[
            { 
              title: "Heart Rate", 
              value: deviceData?.bpm ?? '--',
              unit: " BPM"
            },
            { 
              title: "SpO2", 
              value: deviceData?.spo2 ?? '--',
              unit: "%"
            },
            { 
              title: "Temperature", 
              value: deviceData?.internal_temperature ?? '--',
              unit: "°C"
            },
            { 
              title: "Motor State", 
              value: deviceData?.motor_state ? 'Active' : 'Inactive',
              isActive: deviceData?.motor_state
            }
          ].map((stat, index) => (
            <motion.div 
              key={index}
              className="stat-card"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03,
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
              }}
            >
              <h3>{stat.title}</h3>
              <div className={`stat-value ${stat.isActive ? 'active' : ''}`}>
                {stat.value}{stat.unit}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="history-section"
          ref={historyRef}
          initial="hidden"
          animate={historyInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.h2 variants={itemVariants}>Attack History</motion.h2>
          {deviceData?.history ? (
            <motion.div 
              className="history-table"
              variants={itemVariants}
            >
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>BPM</th>
                    <th>SpO2</th>
                    <th>Temperature</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(deviceData.history) ? 
                    deviceData.history.map((attack, index) => (
                      <motion.tr 
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <td>{new Date(attack.timestamp).toLocaleString()}</td>
                        <td>{attack.duration}s</td>
                        <td>{attack.bpm}</td>
                        <td>{attack.spo2}%</td>
                        <td>{attack.internal_temperature}°C</td>
                      </motion.tr>
                    )) : (
                      <motion.tr>
                        <td>{new Date(deviceData.history.timestamp).toLocaleString()}</td>
                        <td>{deviceData.history.duration}s</td>
                        <td>{deviceData.history.bpm}</td>
                        <td>{deviceData.history.spo2}%</td>
                        <td>{deviceData.history.internal_temperature}°C</td>
                      </motion.tr>
                    )
                  }
                </tbody>
              </table>
            </motion.div>
          ) : (
            <motion.p 
              className="no-data"
              variants={itemVariants}
            >
              No attack history available
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard; 