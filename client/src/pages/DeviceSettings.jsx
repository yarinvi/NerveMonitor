import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect } from 'react';
import { getDeviceData, updateDeviceSettings, getUserDevices } from '../api/device';
import Slider from '@mui/material/Slider';
import { Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { ChromePicker } from 'react-color';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import './DeviceSettings.css';

function DeviceSettings() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [formData, setFormData] = useState({
    bpm_threshold: 120,
    spo2_threshold: 95,
    temperature_threshold: 36.5,
    sensitivity: 'medium',
    led_color: '#4CAF50',
    vibration_intensity: 50
  });
  const [originalSettings, setOriginalSettings] = useState(null);

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
        toast.error('Failed to fetch devices');
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!selectedDevice) return;

      try {
        setLoading(true);
        const response = await getDeviceData(selectedDevice);
        
        // Settings are at the top level of the response
        const settings = response?.settings;
        
        if (!settings) {
          console.error('Response structure:', response);
          throw new Error('Invalid settings data received');
        }
        
        // Update both formData and originalSettings with the received settings
        setFormData(settings);
        setOriginalSettings(settings);
        setError('');
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to fetch device settings');
        toast.error('Failed to fetch device settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [selectedDevice]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await updateDeviceSettings(selectedDevice, formData);
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error('Failed to update settings');
      setError('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleColorPickerClose = (e) => {
    // Only close if clicking outside both the color preview and picker
    const colorPreview = document.querySelector('.color-preview');
    const colorPicker = document.querySelector('.color-picker-popover');
    
    if (!colorPreview?.contains(e.target) && !colorPicker?.contains(e.target)) {
      setShowColorPicker(false);
    }
  };

  useEffect(() => {
    if (showColorPicker) {
      document.addEventListener('mousedown', handleColorPickerClose);
      return () => {
        document.removeEventListener('mousedown', handleColorPickerClose);
      };
    }
  }, [showColorPicker]);

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

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">{error}</div>;
  if (!devices.length) return <div>No devices available</div>;

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
                setFormData(defaultSettings);
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
              formData.bpm_threshold,
              40,
              200,
              tooltips.bpm_threshold
            )}

            {renderSliderWithTooltip(
              'spo2_threshold',
              'SpO2 Threshold',
              formData.spo2_threshold,
              80,
              100,
              tooltips.spo2_threshold
            )}

            {renderSliderWithTooltip(
              'temperature_threshold',
              'Temperature Threshold',
              formData.temperature_threshold,
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
                value={formData.sensitivity}
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
                  style={{ backgroundColor: formData.led_color }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div className="color-picker-popover">
                    <ChromePicker 
                      color={formData.led_color}
                      onChange={(color) => handleChange({ 
                        target: { name: 'led_color', value: color.hex } 
                      })}
                      disableAlpha={true}
                      styles={{
                        default: {
                          picker: {
                            boxShadow: 'none'
                          }
                        }
                      }}
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
                  Vibration Intensity: {formData.vibration_intensity}%
                </label>
                <Tooltip title={tooltips.vibration_intensity} placement="top">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
              <Slider
                value={formData.vibration_intensity}
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