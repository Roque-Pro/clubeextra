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
      url: "https://www.youtube.com/watch?v=PoNBRFUj-Z0"
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
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4 sm:px-6">
      {/* Mini Hero / Header */}
      <div className="w-full max-w-md bg-blue-900 rounded-3xl p-8 mb-8 text-center shadow-xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <img 
            src="/img/iguacu_vidros_white.png" 
            alt="Iguaçu Auto Vidros" 
            className="h-20 object-contain"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-white text-2xl font-display font-bold mb-2">
            Iguaçu Auto Vidros
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Especialistas em vidraçaria automotiva há mais de 20 anos. Qualidade, segurança e os melhores canais para você chegar até nós.
          </p>
        </motion.div>
      </div>

      {/* Links List */}
      <div className="w-full max-w-md space-y-4">
        {links.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index + 0.3, duration: 0.5 }}
          >
            <button
              onClick={() => handleLinkClick(link.url)}
              className={`w-full group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                link.primary 
                  ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] shadow-lg shadow-blue-600/20" 
                  : "bg-white border-gray-100 text-gray-900 hover:border-blue-400 hover:bg-blue-50/50 hover:scale-[1.02] shadow-sm"
              }`}
            >
              <div className={`p-3 rounded-xl mr-4 ${
                link.primary ? "bg-white/20" : "bg-blue-100 text-blue-600"
              }`}>
                {link.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">{link.title}</h3>
                <p className={`text-sm ${link.primary ? "text-blue-100" : "text-gray-500"}`}>
                  {link.description}
                </p>
                {link.phone && (
                  <button
                    onClick={(e) => handlePhoneClick(e, link.phone!)}
                    className={`mt-2 flex items-center text-xs font-semibold py-1 px-3 rounded-full transition-colors ${
                      link.primary 
                        ? "bg-white/20 text-white hover:bg-white/30" 
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    WhatsApp: {link.phone}
                  </button>
                )}
              </div>
              <ExternalLink className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                link.primary ? "text-white" : "text-blue-400"
              }`} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Footer / Signature */}
      <footer className="mt-auto pt-12 text-center">
        <p className="text-gray-400 text-xs mb-2">
          © 2024 Iguaçu Auto Vidros. Todos os direitos reservados.
        </p>
        <a 
          href="https://www.technexos.com.br/diagnostico-gratuito" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          Desenvolvido por <span className="font-bold ml-1">TechNexos</span>
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </footer>
    </div>
  );
};

export default CanaisIguacu;
