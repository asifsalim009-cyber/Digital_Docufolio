const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Update lucide-react imports
code = code.replace(
  /import \{ (.*) \} from 'lucide-react';/,
  "import { $1, Maximize, Minimize } from 'lucide-react';"
);

// 2. Add state and effect for fullscreen
const stateHookPos = code.indexOf('const [user, setUser] = useState<User | null>(null);');
if (stateHookPos !== -1) {
  code = code.slice(0, stateHookPos) + 
`  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen().catch(err => console.error(err));
      }
    } catch(err) {
       console.error("Fullscreen API not supported/allowed in this context.", err);
    }
  };

  ` + code.slice(stateHookPos);
}

// 3. Add Fullscreen button to header
const headerPos = code.indexOf('{/* Connect Google Button */}');
if (headerPos !== -1) {
  code = code.slice(0, headerPos) + 
`{/* Fullscreen Toggle */}
                <button
                    onClick={toggleFullscreen}
                    className="p-2.5 bg-white border border-sand-200 rounded-full text-forest-600 hover:text-gold-600 hover:border-gold-300 shadow-sm transition-all"
                    title="Toggle Fullscreen"
                >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                
                ` + code.slice(headerPos);
}

// Remove max-w-[1920px] and mx-auto just in case
code = code.replace(/max-w-\[1920px\] mx-auto/g, '');

fs.writeFileSync('App.tsx', code);
