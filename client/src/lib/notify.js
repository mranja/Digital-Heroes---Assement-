import { toast } from 'react-toastify';

const baseConfig = {
  position: 'top-right',
  autoClose: 2600,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true
};

export const notify = {
  success: (message, options = {}) => toast.success(message, { ...baseConfig, ...options }),
  error: (message, options = {}) => toast.error(message, { ...baseConfig, ...options }),
  info: (message, options = {}) => toast.info(message, { ...baseConfig, ...options }),
  warning: (message, options = {}) => toast.warn(message, { ...baseConfig, ...options })
};

export default notify;
