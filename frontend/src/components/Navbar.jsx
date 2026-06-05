import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className={`${!isAdmin ? 'bg-black md:bg-white border-gray-800 md:border-gray-200' : 'bg-white border-gray-200'} border-b px-4 py-3 flex items-center justify-between shadow-sm`}>
      <button
        onClick={() => navigate('/')}
        className={`text-xl font-bold tracking-tight ${!isAdmin ? 'text-pink-400 md:text-indigo-600' : 'text-indigo-600'}`}
      >
        Payyatu
      </button>
      {user && (
        <div className="flex items-center gap-3">
          <span className={`text-sm ${!isAdmin ? 'text-gray-400 md:text-gray-500' : 'text-gray-500'}`}>
            {user.name}
            <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
              {user.role}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
