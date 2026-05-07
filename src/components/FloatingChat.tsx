import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  sender: "bot" | "user";
  type?: "text" | "options" | "links";
  options?: { id: string; label: string; value: string }[];
  links?: { id: string; label: string; url: string }[];
}

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Olá! 👋 Bem-vindo à Iguaçu Auto Vidros. Como podemos ajudá-lo?",
      sender: "bot",
      type: "options",
      options: [
        { id: "1", label: "1️⃣ Agendar um serviço", value: "1" },
        { id: "2", label: "2️⃣ Visitar uma de nossas lojas", value: "2" },
        { id: "3", label: "3️⃣ Falar com a Loja", value: "3" },
      ],
    },
  ]);
  const [input, setInput] = useState("");

  const handleSendMessage = (value?: string) => {
    const messageText = value || input;
    if (!messageText.trim()) return;

    // Adiciona mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simula resposta do bot
    setTimeout(() => {
      if (messageText === "1" || messageText.toLowerCase().includes("agendar")) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "Perfeito! Clique no link abaixo para agendar seu serviço:",
            sender: "bot",
            type: "links",
            links: [
              {
                id: "1",
                label: "📋 Agendar Serviço",
                url: "/plan-auth",
              },
            ],
          },
        ]);
      } else if (messageText === "2" || messageText.toLowerCase().includes("lojas")) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "Nossas lojas estão localizadas em:",
            sender: "bot",
            type: "links",
            links: [
              {
                id: "1",
                label: "🗺️ Iguaçu Auto Vidros - Rua Oscar Soares, 1226",
                url: "https://maps.google.com/?q=Rua+Oscar+Soares,+1226,+Califórnia,+Nova+Iguaçu,+RJ",
              },
              {
                id: "2",
                label: "🗺️ Iguaçu Som e Acessórios - Rua Carlos Marques Rollo, 1123",
                url: "https://maps.google.com/?q=Rua+Carlos+Marques+Rollo,+1123,+Califórnia,+Nova+Iguaçu,+RJ",
              },
              {
                id: "3",
                label: "🗺️ JJ Parabrisas - Avenida Nilo Peçanha, 1058",
                url: "https://maps.google.com/?q=Avenida+Nilo+Peçanha,+1058,+Centro,+Nova+Iguaçu,+RJ",
              },
            ],
          },
        ]);
      } else if (messageText === "3" || messageText.toLowerCase().includes("falar")) {
        const whatsappNumber = "21974636253";
        const whatsappMessage = "Olá, vi vocês pelo Google e gostaria de saber mais";
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "Ótimo! Clique no botão abaixo para conversar com a gente no WhatsApp:",
            sender: "bot",
            type: "links",
            links: [
              {
                id: "1",
                label: "💬 Abrir WhatsApp",
                url: whatsappUrl,
              },
            ],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "Desculpe, não entendi. Digite 1 para agendar um serviço ou 2 para ver nossas lojas.",
            sender: "bot",
            type: "options",
            options: [
              { id: "1", label: "1️⃣ Agendar um serviço", value: "1" },
              { id: "2", label: "2️⃣ Visitar uma de nossas lojas", value: "2" },
              { id: "3", label: "3️⃣ Falar com a Loja", value: "3" },
            ],
          },
        ]);
      }
    }, 500);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Pulso de fundo */}
        <motion.div
          className="absolute inset-0 w-16 h-16 bg-[#25D366] rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Botão principal */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-16 h-16 bg-[#25D366] text-white rounded-full shadow-lg hover:shadow-2xl flex items-center justify-center border-4 border-white"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            boxShadow: [
              "0 0 0 0px rgba(37, 211, 102, 0.7)",
              "0 0 0 15px rgba(37, 211, 102, 0)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Chat Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 right-6 w-96 h-screen max-h-96 bg-white rounded-lg shadow-2xl flex flex-col z-40 border border-gray-200"
          >
            {/* Header */}
            <div className="bg-[#25D366] text-white p-4 rounded-t-lg">
              <h3 className="font-semibold text-lg">Iguaçu Auto Vidros</h3>
              <p className="text-xs text-white/80">Responde em poucos segundos</p>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    msg.sender === "bot" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs px-4 py-2 rounded-lg",
                      msg.sender === "bot"
                        ? "bg-gray-100 text-gray-900"
                        : "bg-[#25D366] text-white"
                    )}
                  >
                    <p className="text-sm">{msg.text}</p>

                    {/* Opções */}
                    {msg.type === "options" && msg.options && (
                      <div className="mt-3 space-y-2">
                        {msg.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleSendMessage(option.value)}
                            className="w-full text-left text-sm bg-white text-gray-900 hover:bg-gray-50 rounded px-3 py-2 border border-gray-200 transition"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Links */}
                    {msg.type === "links" && msg.links && (
                      <div className="mt-3 space-y-2">
                        {msg.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 rounded px-3 py-2 text-center transition font-bold border-2 border-green-400 shadow-md"
                          >
                            {link.label} 📍
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="Digite 1 ou 2..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366] text-sm"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-[#25D366] text-white p-2 rounded-lg hover:bg-[#128C7E] transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChat;
