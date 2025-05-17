import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';
import { toast } from 'react-toastify';
import './Contact.css';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Message sent successfully!');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="container">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1 variants={itemVariants}>Contact Us</motion.h1>
          <motion.p variants={itemVariants} className="contact-intro">
            Have questions about NerveMonitor? We're here to help!
          </motion.p>
        </motion.div>

        <motion.div 
          className="contact-content"
          ref={formRef}
          initial="hidden"
          animate={formInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div 
            className="contact-info"
            variants={itemVariants}
          >
            <div className="info-item">
              <i className="material-icons">location_on</i>
              <div>
                <h3>Address</h3>
                <p>Kinneret College<br />1513200</p>
              </div>
            </div>
            <div className="info-item">
              <i className="material-icons">email</i>
              <div>
                <h3>Email</h3>
                <p>support@nervemonitor.com</p>
              </div>
            </div>
            <div className="info-item">
              <i className="material-icons">phone</i>
              <div>
                <h3>Phone</h3>
                <p>+972 54 6750 868</p>
              </div>
            </div>
          </motion.div>

          <motion.form 
            onSubmit={handleSubmit}
            className="contact-form"
            variants={itemVariants}
          >
            <motion.div 
              className="form-group"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </motion.div>

            <motion.div 
              className="form-group"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </motion.div>

            <motion.div 
              className="form-group"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </motion.button>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}

export default Contact; 