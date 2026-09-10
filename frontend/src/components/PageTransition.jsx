import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import "./PageTransition.css";

function PageTransition({ children }) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);

    const timer = setTimeout(() => {
      setVisible(true);
    }, 30);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className={`page-transition ${
        visible ? "page-transition-visible" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default PageTransition;