import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { getDeviceData, getUserDevices } from '../api/device';
import LoadingSpinner from '../components/LoadingSpinner';
import './AttackHistory.css';

function AttackHistory() {
  const [attacks, setAttacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    severity: 'all'
  });
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [filtersRef, filtersInView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  const [tableRef, tableInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
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
    const fetchDevices = async () => {
      try {
        const devicesData = await getUserDevices();
        const formattedDevices = Object.entries(devicesData).map(([id, device]) => ({
          id,
          ...device
        }));
        if (formattedDevices.length > 0) {
          setSelectedDevice(formattedDevices[0].id);
        }
      } catch (err) {
        setError('Failed to fetch devices');
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;
    
    const fetchAttackHistory = async () => {
      try {
        const response = await getDeviceData(selectedDevice);
        
        if (response && response.history) {
            const historyEntries = Object.entries(response.history)
              .filter(([_, entry]) => entry && typeof entry === 'object')
              .map(([timestamp, entry]) => {
                // Convert timestamp to Date
                const timestampNum = parseInt(timestamp);
                const date = new Date(timestampNum > 9999999999 ? timestampNum : timestampNum * 1000);
                
                return {
                  id: timestamp,
                  timestamp: date,
                  duration: Math.ceil(entry.duration / 1000), // Convert ms to seconds and round up
                  bpm: entry.bpm,
                  spo2: entry.spo2,
                  temperature: entry.temperature || entry.internal_temperature,
                  severity: calculateSeverity(entry.bpm, entry.spo2),
                  triggered_by: entry.triggered_by
                };
              })
              .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first

            setAttacks(historyEntries);
        }
      } catch (err) {
        setError('Failed to load attack history');
      } finally {
        setLoading(false);
      }
    };

    fetchAttackHistory();
  }, [selectedDevice]);

  const calculateSeverity = (bpm, spo2) => {
    if (bpm > 120 || spo2 < 90) return 'high';
    if (bpm > 100 || spo2 < 95) return 'medium';
    return 'low';
  };

  const filteredAttacks = attacks.filter(attack => {
    const date = new Date(attack.timestamp);
    const meetsDateFrom = !filters.dateFrom || date >= new Date(filters.dateFrom);
    const meetsDateTo = !filters.dateTo || date <= new Date(filters.dateTo);
    const meetsSeverity = filters.severity === 'all' || attack.severity === filters.severity;
    return meetsDateFrom && meetsDateTo && meetsSeverity;
  });

  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="attack-history">
      <div className="container">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1 variants={itemVariants}>Attack History</motion.h1>
        </motion.div>

        <motion.div 
          className="filters-section"
          ref={filtersRef}
          initial="hidden"
          animate={filtersInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div className="filter-group" variants={itemVariants}>
            <label>From:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </motion.div>
          <motion.div className="filter-group" variants={itemVariants}>
            <label>To:</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </motion.div>
          <motion.div className="filter-group" variants={itemVariants}>
            <label>Severity:</label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </motion.div>
        </motion.div>

        <motion.div
          ref={tableRef}
          initial="hidden"
          animate={tableInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {filteredAttacks.length === 0 ? (
            <motion.p 
              className="no-data"
              variants={itemVariants}
            >
              No attacks found for the selected filters
            </motion.p>
          ) : (
            <motion.div 
              className="attacks-table"
              variants={itemVariants}
            >
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Heart Rate</th>
                    <th>SpO2</th>
                    <th>Temperature</th>
                    <th>Severity</th>
                    <th>Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttacks.map((attack) => (
                    <motion.tr
                      key={attack.id}
                      className={`severity-${attack.severity}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td>{attack.timestamp.toLocaleString()}</td>
                      <td>{attack.duration}s</td>
                      <td>{attack.bpm} BPM</td>
                      <td>{attack.spo2}%</td>
                      <td>{attack.temperature}°C</td>
                      <td>
                        <span className={`severity-badge ${attack.severity}`}>
                          {attack.severity.charAt(0).toUpperCase() + attack.severity.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`trigger-badge ${attack.triggered_by}`}>
                          {attack.triggered_by === 'metrics' ? 'Metrics' : 'Manual'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default AttackHistory; 