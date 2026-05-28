import { useNavigate } from "react-router-dom";
import carviaImg from "../assets/Carvia.png";

export default function Logo({ size = 26, to = "/" }) {
  const navigate = useNavigate();
  return (
    <button className="logo" onClick={() => navigate(to)} aria-label="Carvía inicio" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <img src={carviaImg} alt="Carvía" style={{ height: size * 1.6, width: "auto", display: "block" }} />
    </button>
  );
}
