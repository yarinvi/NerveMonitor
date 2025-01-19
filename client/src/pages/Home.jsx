import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  const [featuresRef, featuresInView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  const [statsRef, statsInView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  });

  const [aboutRef, aboutInView] = useInView({
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
        staggerChildren: 0.2
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

  const heroVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.3
      }
    }
  };

  return (
    <div className="home">
      <motion.div 
        className="hero"
        initial="hidden"
        animate="visible"
        variants={heroVariants}
      >
        <div className="container">
          <motion.h1 variants={itemVariants}>
            Protect Your Wrist Health with NerveMonitor
          </motion.h1>
          <motion.p variants={itemVariants}>
            Advanced Wearable Technology for Early Detection and Prevention of Carpal Tunnel Syndrome
          </motion.p>
          <motion.div variants={itemVariants} className="hero-cta">
            <Link to="/register" className="cta-button primary">Get Started</Link>
            <Link to="/about" className="cta-button secondary">Learn More</Link>
          </motion.div>
        </div>
      </motion.div>
      
      <div className="container">
        <motion.section 
          className="features"
          ref={featuresRef}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.h2 variants={itemVariants}>
            Comprehensive Wrist Health Solution
          </motion.h2>
          <motion.p variants={itemVariants} className="section-intro">
            Our innovative technology combines real-time monitoring, early warning systems, and personalized insights to protect your wrist health.
          </motion.p>
          <div className="features-grid">
            {[
              {
                icon: "watch",
                title: "Smart Monitoring",
                desc: "24/7 real-time tracking of nerve conductivity, pressure, and movement patterns with medical-grade accuracy"
              },
              {
                icon: "notifications",
                title: "Early Warning System",
                desc: "Instant alerts when risk patterns are detected, allowing immediate preventive action"
              },
              {
                icon: "health_and_safety",
                title: "Prevention First",
                desc: "AI-powered recommendations for exercises and posture adjustments tailored to your usage patterns"
              },
              {
                icon: "analytics",
                title: "Data Analytics",
                desc: "Comprehensive health metrics analysis with detailed insights and progress tracking"
              },
              {
                icon: "phone_android",
                title: "Mobile Integration",
                desc: "Seamless connection with our mobile app for real-time monitoring and instant notifications"
              },
              {
                icon: "cloud_done",
                title: "Secure Cloud Storage",
                desc: "HIPAA-compliant cloud storage for your health data with enterprise-grade security"
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                className="feature-card"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                }}
              >
                <i className="material-icons">{feature.icon}</i>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section 
          className="stats"
          ref={statsRef}
          initial="hidden"
          animate={statsInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.h2 variants={itemVariants}>Trusted by Professionals</motion.h2>
          <div className="stats-grid">
            {[
              { value: "50,000+", label: "Active Users" },
              { value: "92%", label: "Prevention Rate" },
              { value: "24/7", label: "Monitoring" },
              { value: "15+", label: "Clinical Studies" }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                className="stat-card"
                variants={itemVariants}
              >
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section 
          className="about"
          ref={aboutRef}
          initial="hidden"
          animate={aboutInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.h2 variants={itemVariants}>
            About NerveMonitor
          </motion.h2>
          <motion.div className="about-content" variants={itemVariants}>
            <div className="about-text">
              <p>NerveMonitor is a pioneering biotech company specializing in innovative wearable solutions for carpal tunnel syndrome prevention. Our team of medical professionals and engineers has developed cutting-edge technology that combines comfort with clinical-grade monitoring.</p>
              <p>Founded in 2020, we've quickly become a trusted name in preventive healthcare technology, working closely with leading hospitals and corporations to protect employee health.</p>
              <Link to="/about" className="learn-more">
                Learn More About Us <i className="material-icons">arrow_forward</i>
              </Link>
            </div>
            <div className="about-image">
              <img src="/src/images/about-device.jpg" alt="NerveMonitor Device" />
            </div>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}

export default Home; 