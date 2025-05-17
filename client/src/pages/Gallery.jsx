import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './Gallery.css';

function Gallery() {
  const [infoRef, infoInView] = useInView({
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

  return (
    <div className="gallery-page">
      <div className="container">
        <motion.section 
          className="info-section"
          ref={infoRef}
          initial="hidden"
          animate={infoInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.h1 variants={itemVariants}>
            Understanding Carpal Tunnel Syndrome
          </motion.h1>
          <motion.p variants={itemVariants}>
            Carpal tunnel syndrome (CTS) is a common condition affecting millions worldwide. 
            Early detection and prevention are crucial for maintaining long-term wrist health 
            and avoiding permanent nerve damage. Learn more about the causes, symptoms, and 
            prevention methods below.
          </motion.p>
        </motion.section>

        <motion.section 
          className="stats-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {[
            { number: "3-6%", label: "Of Adults Affected" },
            { number: "50%", label: "Higher Risk for Office Workers" },
            { number: "80%", label: "Cases Preventable" },
            { number: "600K+", label: "Surgeries Annually" }
          ].map((stat, index) => (
            <motion.div 
              key={index}
              className="stat-card"
              variants={itemVariants}
            >
              <h3>{stat.number}</h3>
              <p>{stat.label}</p>
            </motion.div>
          ))}
        </motion.section>

        <motion.section 
          className="gallery-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {[
            {
              img: "/src/images/anatomy.jpg",
              title: "Wrist Anatomy",
              desc: "The carpal tunnel is a narrow passageway surrounded by bones and ligaments on the palm side of your wrist."
            },
            {
              img: "/src/images/symptoms.jpg",
              title: "Common Symptoms",
              desc: "Early signs include numbness, tingling, and weakness in the hand and arm, particularly at night."
            },
            {
              img: "/src/images/prevention.jpg",
              title: "Prevention Methods",
              desc: "Proper ergonomics, regular breaks, and wrist exercises can significantly reduce your risk."
            },
            {
              img: "/src/images/treatment.jpg",
              title: "Treatment Options",
              desc: "From conservative approaches to surgical interventions, learn about available treatment methods."
            },
            {
              img: "/src/images/workplace.jpg",
              title: "Workplace Ergonomics",
              desc: "Set up your workspace correctly to minimize strain on your wrists and hands."
            },
            {
              img: "/src/images/exercises.jpg",
              title: "Therapeutic Exercises",
              desc: "Simple exercises and stretches that can help prevent and manage CTS symptoms."
            }
          ].map((item, index) => (
            <motion.div 
              key={index}
              className="gallery-item"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <img src={item.img} alt={item.title} />
              <div className="caption">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.section>

        <motion.section 
          className="resources-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.h2 variants={itemVariants}>Educational Resources</motion.h2>
          <div className="resources-grid">
            <motion.div className="resource-card" variants={itemVariants}>
              <h3>Research & Studies</h3>
              <p>Access the latest scientific research and clinical studies on CTS prevention and treatment.</p>
              <a href="/research" className="learn-more">
                View Research <i className="material-icons">arrow_forward</i>
              </a>
            </motion.div>
            <motion.div className="resource-card" variants={itemVariants}>
              <h3>Prevention Guide</h3>
              <p>Download our comprehensive guide to preventing CTS in the workplace and at home.</p>
              <a href="/prevention-guide" className="learn-more">
                Download Guide <i className="material-icons">arrow_forward</i>
              </a>
            </motion.div>
          </div>
        </motion.section>

        <motion.section 
          className="video-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.h2 variants={itemVariants}>Expert Insights</motion.h2>
          <motion.p variants={itemVariants}>
            Learn from medical professionals about the importance of early detection and prevention of Carpal Tunnel Syndrome.
          </motion.p>
          <motion.div 
            className="video-wrapper"
            variants={itemVariants}
          >
            <div className="video-container">
              <iframe 
                src="https://www.youtube.com/embed/8jInQzxbDU0" 
                title="Understanding Carpal Tunnel Syndrome"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="video-info">
              <h3>Video Highlights</h3>
              <ul>
                <li><i className="material-icons">check_circle</i>Understanding CTS symptoms and causes</li>
                <li><i className="material-icons">check_circle</i>Prevention strategies for office workers</li>
                <li><i className="material-icons">check_circle</i>Expert recommendations for ergonomic setup</li>
                <li><i className="material-icons">check_circle</i>Simple exercises for wrist health</li>
              </ul>
            </div>
          </motion.div>
        </motion.section>
      </div>
    </div>
  );
}

export default Gallery; 