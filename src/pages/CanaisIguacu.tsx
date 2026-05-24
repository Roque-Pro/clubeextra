import { motion } from "framer-motion";
import { 
  Globe, 
  MapPin, 
  Phone, 
  PlayCircle, 
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CanaisIguacu = () => {
  const links = [
    {
      title: "Clube do Vidro",
      description: "Conheça nosso clube exclusivo e benefícios",
      icon: <Globe className="w-6 h-6" />,
      url: "/",
      primary: true
    },
    {
      title: "Loja 01 - Jardim Imperial",
      description: "Av: Carlos Marques Rollo, 1123",
      phone: "21974636253",
      icon: <MapPin className="w-6 h-6" />,
      url: "https://www.google.com/maps/search/Rua+Carlos+Marques+Rollo+1123+Califórnia+Nova+Iguaçu"
    },
    {
      title: "Loja 02 - Centro Nova Iguaçu",
      description: "Rua Oscar Soares, 1226",
      phone: "21982772904",
      icon: <MapPin className="w-6 h-6" />,
      url: "https://www.google.com/maps/search/Rua+Oscar+Soares+1226+Califórnia+Nova+Iguaçu"
    },
    {
      title: "Loja 03 - Centro Nova Iguaçu",
      description: "Av: Nilo Peçanha, 1058",
      phone: "21974636253",
      icon: <MapPin className="w-6 h-6" />,
      url: "https://www.google.com/maps/search/Avenida+Nilo+Peçanha+1058+Centro+Nova+Iguaçu"
    },
    {
      title: "Conheça nossa história",
      description: "Assista ao vídeo e saiba mais sobre nós",
      icon: <PlayCircle className="w-6 h-6" />,
      url: "https://youtu.be/PoNBRFUj-Z0?si=_vlfdFIgYMi8cYZS"
    }
  ];

  const handleLinkClick = (url: string) => {
    if (url.startsWith("/")) {
      window.location.href = url;
    } else {
      window.open(url, "_blank");
    }
  };

  const handlePhoneClick = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Header / Top Bar - Width 100% */}
      <div className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 py-12 px-4 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
        </div>

        <div className="max-w-md mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="flex justify-center mb-6"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <img 
                src="/img/iguacu_vidros_white.png" 
                alt="Iguaçu Auto Vidros" 
                className="relative h-24 object-contain drop-shadow-2xl"
              />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-white text-3xl font-display font-black tracking-tight mb-3">
              Iguaçu Auto Vidros
            </h1>
            <div className="h-1 w-12 bg-blue-400 mx-auto rounded-full mb-4" />
            <p className="text-blue-100/90 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              Especialistas em segurança e confiança automotiva. Conecte-se com nossas unidades e conheça nossos serviços.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Links List */}
      <div className="w-full max-w-md px-4 -mt-8 pb-12 space-y-4 relative z-20">
        {links.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index + 0.4, duration: 0.5 }}
          >
            <button
              onClick={() => handleLinkClick(link.url)}
              className={`w-full group relative flex items-center p-5 rounded-2xl border transition-all duration-300 text-left ${
                link.primary 
                  ? "bg-blue-600 border-blue-500 text-white hover:bg-blue-700 hover:scale-[1.03] shadow-xl shadow-blue-600/30" 
                  : "bg-white border-slate-200 text-slate-900 hover:border-blue-300 hover:bg-white hover:scale-[1.03] shadow-lg shadow-slate-200/50"
              }`}
            >
              <div className={`p-4 rounded-xl mr-4 transition-transform group-hover:scale-110 ${
                link.primary ? "bg-white/10" : "bg-blue-50 text-blue-600"
              }`}>
                {link.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg tracking-tight">{link.title}</h3>
                <p className={`text-sm mt-0.5 ${link.primary ? "text-blue-100" : "text-slate-500"}`}>
                  {link.description}
                </p>
                {link.phone && (
                  <button
                    onClick={(e) => handlePhoneClick(e, link.phone!)}
                    className={`mt-3 flex items-center text-xs font-bold py-1.5 px-4 rounded-full transition-all ${
                      link.primary 
                        ? "bg-white/20 text-white hover:bg-white/30" 
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 mr-2" />
                    Chamar no WhatsApp
                  </button>
                )}
              </div>
              <div className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 ${
                link.primary ? "bg-white/10" : "bg-blue-50"
              }`}>
                <ExternalLink className={`w-4 h-4 ${
                  link.primary ? "text-white" : "text-blue-500"
                }`} />
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Footer / Signature */}
      <footer className="mt-auto py-10 w-full text-center bg-white border-t border-slate-100">
        <a 
          href="https://www.technexos.com.br/diagnostico-gratuito" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group inline-flex flex-col items-center gap-2"
        >
          <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Powered by</span>
          <div className="flex items-center text-slate-600 group-hover:text-blue-600 transition-colors">
            <span className="font-black text-lg tracking-tighter">TECH<span className="text-blue-600 group-hover:text-blue-500">NEXOS</span></span>
            <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
          </div>
        </a>
      </footer>
    </div>
  );
};

export default CanaisIguacu;
