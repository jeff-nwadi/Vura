import React from 'react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'info' | 'error' | 'success';
}

const AlertDialog: React.FC<AlertDialogProps> = ({ isOpen, title, message, onClose, type = 'info' }) => {
  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'error': return 'text-red-400 border-red-500/50 bg-red-900/20';
      case 'success': return 'text-green-400 border-green-500/50 bg-green-900/20';
      default: return 'text-blue-400 border-blue-500/50 bg-blue-900/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-card w-full max-w-md p-6 rounded-2xl border shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border-border`}>
        <h3 className={`text-xl font-bold mb-2 ${getColors().split(' ')[0]}`}>{title}</h3>
        <p className="text-gray-300 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
