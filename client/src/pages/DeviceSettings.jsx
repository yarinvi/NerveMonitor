import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { getDeviceData, updateDeviceSettings, getUserDevices } from '../api/api';
import Slider from '@mui/material/Slider';
import { Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { ChromePicker } from 'react-color';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import './DeviceSettings.css';

function DeviceSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [success, setSuccess] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [formRef, formInView] = useInView({
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

  const tooltips = {
    bpm_threshold: "Heart rate monitoring range (40-200 BPM). Recommended: 120 BPM for most users. Alerts trigger when exceeded.",
    spo2_threshold: "Blood oxygen saturation (80-100%). Recommended: >95%. Critical alert below 90%.",
    temperature_threshold: "Wrist temperature monitoring (20-40°C). Normal range: 30-35°C. Alerts for inflammation.",
    sensitivity: "Sensor sensitivity affects alert frequency. High for detailed monitoring, Medium for balanced, Low for fewer alerts.",
    led_color: "Customize LED indicator color for alerts and status. Green is default.",
    vibration_intensity: "Haptic feedback strength (0-100). Higher values consume more battery.",
    notification_frequency: "How often to receive non-critical alerts. Affects battery life."
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devicesData = await getUserDevices();
        const formattedDevices = Object.entries(devicesData).map(([id, device]) => ({
          id,
          ...device
        }));
        setDevices(formattedDevices);
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

    const fetchSettings = async () => {
      try {
        const data = await getDeviceData(selectedDevice);
        setSettings({
          bpm_threshold: data.settings?.bpm_threshold ?? 120,
          spo2_threshold: data.settings?.spo2_threshold ?? 95,
          temperature_threshold: data.settings?.temperature_threshold ?? 36.5,
          sensitivity: data.settings?.sensitivity ?? 'medium',
          vibration_intensity: data.settings?.vibration_intensity ?? 50,
          led_color: data.settings?.led_color ?? '#4CAF50'
        });
      } catch (err) {
        setError('Failed to load device settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [selectedDevice]);

  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      await updateDeviceSettings(selectedDevice, settings);
      toast.success('Settings updated successfully');
      setSuccess('Settings updated successfully');
    } catch (err) {
      toast.error('Failed to update settings');
      setError('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleColorPickerClose = () => {
    setShowColorPicker(false);
  };

  useEffect(() => {
    if (showColorPicker) {
      document.addEventListener('mousedown', handleColorPickerClose);
      return () => {
        document.removeEventListener('mousedown', handleColorPickerClose);
      };
    }
  }, [showColorPicker]);

  useEffect(() => {
    let timeoutId;
    if (success) {
      timeoutId = setTimeout(() => {
        setSuccess('');
      }, 4000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [success]);

  const renderSliderWithTooltip = (name, label, value, min, max, tooltip, step = 1) => (
    <motion.div 
      className="setting-item"
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
    >
      <div className="setting-header">
        <label htmlFor={name}>{label}: {value}</label>
        <Tooltip title={tooltip} placement="top">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
      <Slider
        value={Number(value)}
        onChange={(_, value) => handleChange({ target: { name, value } })}
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
        marks={[
          { value: min, label: `${min}${name.includes('temperature') ? '°C' : name.includes('spo2') ? '%' : ''}` },
          { value: max, label: `${max}${name.includes('temperature') ? '°C' : name.includes('spo2') ? '%' : ''}` }
        ]}
      />
    </motion.div>
  );

  if (!selectedDevice) {
    return <LoadingSpinner />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="device-settings">
      <div className="container">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="header-container">
            <motion.h1 variants={itemVariants}>Device Settings</motion.h1>
            <motion.button
              className="reset-button"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                const defaultSettings = {
                  bpm_threshold: 120,
                  spo2_threshold: 95,
                  temperature_threshold: 36.5,
                  sensitivity: 'medium',
                  led_color: '#4CAF50',
                  vibration_intensity: 50
                };
                setSettings(defaultSettings);
                try {
                  await updateDeviceSettings(selectedDevice, defaultSettings);
                  toast.info('Settings reset to defaults');
                } catch (err) {
                  toast.error('Failed to save default settings');
                }
              }}
            >
              Reset to Defaults
            </motion.button>
          </div>
          
          {error && (
            <motion.div 
              className="error-message"
              variants={itemVariants}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {error}
            </motion.div>
          )}
          
          {success && (
            <motion.div 
              className="success-message"
              variants={itemVariants}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {success}
            </motion.div>
          )}
        </motion.div>
        
        <motion.form 
          onSubmit={handleSubmit}
          ref={formRef}
          initial="hidden"
          animate={formInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div className="settings-grid" variants={itemVariants}>
            {renderSliderWithTooltip(
              'bpm_threshold',
              'Heart Rate Threshold',
              settings.bpm_threshold,
              40,
              200,
              tooltips.bpm_threshold
            )}

            {renderSliderWithTooltip(
              'spo2_threshold',
              'SpO2 Threshold',
              settings.spo2_threshold,
              80,
              100,
              tooltips.spo2_threshold
            )}

            {renderSliderWithTooltip(
              'temperature_threshold',
              'Temperature Threshold',
              settings.temperature_threshold,
              20,
              40,
              tooltips.temperature_threshold,
              0.1
            )}

            <motion.div 
              className="setting-item"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="setting-header">
                <label htmlFor="sensitivity">Sensitivity Level</label>
                <Tooltip title={tooltips.sensitivity} placement="top">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
              <select
                id="sensitivity"
                name="sensitivity"
                value={settings.sensitivity}
                onChange={handleChange}
                required
                className="styled-select"
              >
                <option value="">Select sensitivity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </motion.div>

            <motion.div 
              className="setting-item"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="setting-header">
                <label htmlFor="led_color">LED Color</label>
                <Tooltip title={tooltips.led_color} placement="top">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
              <div className="color-picker-wrapper">
                <div 
                  className="color-preview"
                  style={{ backgroundColor: settings.led_color }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div className="color-picker-popover">
                    <ChromePicker 
                      color={settings.led_color}
                      onChange={(color) => handleChange({ 
                        target: { name: 'led_color', value: color.hex } 
                      })}
                    />
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              className="setting-item"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="setting-header">
                <label htmlFor="vibration_intensity">
                  Vibration Intensity: {settings.vibration_intensity}%
                </label>
                <Tooltip title={tooltips.vibration_intensity} placement="top">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
              <Slider
                value={settings.vibration_intensity}
                onChange={(_, value) => handleChange({ 
                  target: { name: 'vibration_intensity', value } 
                })}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </motion.div>
          </motion.div>
          
          <motion.button 
            type="submit" 
            className="save-button" 
            disabled={loading}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

export default DeviceSettings; 