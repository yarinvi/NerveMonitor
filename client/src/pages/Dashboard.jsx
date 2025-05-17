import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDeviceData, getUserDevices, updateDeviceSettings } from '../api/device'; //important
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
  const [clientOn, setClientOn] = useState(0);

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
          client_on: response.data?.client_on ?? 0,
          history: response.history || {}  // Ensure history is an object
        };
        
        setDeviceData(processedData);
        setClientOn(processedData.client_on);
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
        history: data.history || deviceData.history || [],
        client_on: data.data.client_on ?? clientOn
      };

      setDeviceData(processedData);
      setClientOn(processedData.client_on);
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
          <motion.h1 variants={itemVariants}>Vibrate</motion.h1>
          <motion.div variants={itemVariants}>
            <button 
              onClick={async () => {
                try {
                  const newClientOn = clientOn === 1 ? 0 : 1;
                  
                  // Update both settings and data
                  await updateDeviceSettings(selectedDevice, {
                    client_on: newClientOn
                  });
                  
                  // Update local state immediately
                  setClientOn(newClientOn);
                  setDeviceData(prev => ({
                    ...prev,
                    client_on: newClientOn
                  }));
                } catch (error) {
                  console.error('Failed to toggle vibration:', error);
                  setError('Failed to toggle vibration');
                }
              }}
              className="settings-button"
            >
              {clientOn === 1 ? 'Deactivate Vibration' : 'Activate Vibration'}
            </button>
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
          {deviceData?.history && Object.keys(deviceData.history).length > 0 ? (
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
                    <th>Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(deviceData.history)
                    .filter(([_, attack]) => attack && typeof attack === 'object')
                    .sort(([timestampA], [timestampB]) => parseInt(timestampB) - parseInt(timestampA))
                    .map(([timestamp, attack]) => {
                      // Convert milliseconds to seconds if needed and create date
                      const timestampNum = parseInt(timestamp);
                      const date = new Date(timestampNum > 9999999999 ? timestampNum : timestampNum * 1000);
                      
                      // Convert duration from milliseconds to seconds and format
                      const durationInSeconds = Math.ceil(attack.duration / 1000);
                      const duration = `${durationInSeconds}s`;

                      return (
                        <motion.tr 
                          key={timestamp}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <td>{date.toLocaleString()}</td>
                          <td>{duration}</td>
                          <td>{attack.bpm}</td>
                          <td>{attack.spo2}%</td>
                          <td>{attack.temperature || attack.internal_temperature}°C</td>
                          <td>
                            <span className={`trigger-badge ${attack.triggered_by}`}>
                              {attack.triggered_by === 'metrics' ? 'Metrics' : 'Manual'}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
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