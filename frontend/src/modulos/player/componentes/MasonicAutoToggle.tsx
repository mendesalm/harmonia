import React from 'react';

interface AutoToggleProps {
  modoAuto: boolean;
  onChange: (isAuto: boolean) => void;
}

export const MasonicAutoToggle: React.FC<AutoToggleProps> = ({ modoAuto, onChange }) => {
  return (
    <div className="flex justify-center my-2">
      <div className="relative w-64 h-10 rounded-full border border-macaonico-dourado p-1 flex bg-[#0a0a0a]">
        
        {/* Animated pill background */}
        <div 
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-in-out"
          style={{ 
            left: modoAuto ? 'calc(50% + 2px)' : '4px',
            background: modoAuto ? 'linear-gradient(90deg, #D4AF37 0%, #FBF5B7 50%, #D4AF37 100%)' : '#E0E0E0' 
          }}
        ></div>

        <button 
          onClick={() => onChange(false)}
          className={`flex-1 relative z-10 text-center font-cinzel text-sm flex items-center justify-center transition-colors ${!modoAuto ? 'text-black font-bold' : 'text-macaonico-inactive'}`}
        >
          Manual
        </button>
        <button 
          onClick={() => onChange(true)}
          className={`flex-1 relative z-10 text-center font-cinzel text-sm flex items-center justify-center transition-colors ${modoAuto ? 'text-black font-bold' : 'text-macaonico-dourado'}`}
        >
          Automatic
        </button>
      </div>
    </div>
  );
};
