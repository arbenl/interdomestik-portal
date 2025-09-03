import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/signin">Sign In</Link></li>
        <li><Link to="/signup">Sign Up</Link></li>
        <li><Link to="/profile">Profile</Link></li>
        <li><Link to="/agent">Agent</Link></li>
        <li><Link to="/admin">Admin</Link></li>
      </ul>
    </nav>
  );
}
