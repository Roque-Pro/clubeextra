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
        { id: "1", label: "1️⃣ Agendar um serviço", value: "agendamento" },
        { id: "2", label: "2️⃣ Visitar uma de nossas lojas", value: "lojas" },
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
                url: "https://www.autovidrosiguacu.com.br/agendamento", // Substitua pela URL correta
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
                label: "📍 Nova Iguaçu (Sede) - Rua Oscar Soares, 1226",
                url: "https://maps.google.com/?q=Rua+Oscar+Soares,+1226,+Nova+Iguaçu,+RJ", // Google Maps
              },
              {
                id: "2",
                label: "📍 Loja 2 - [Endereço 2]",
                url: "https://maps.google.com/", // Substitua
              },
              {
                id: "3",
                label: "📍 Loja 3 - [Endereço 3]",
                url: "https://maps.google.com/", // Substitua
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
              { id: "1", label: "1️⃣ Agendar um serviço", value: "agendamento" },
              { id: "2", label: "2️⃣ Visitar uma de nossas lojas", value: "lojas" },
            ],
          },
        ]);
      }
    }, 500);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
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
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
              <h3 className="font-semibold text-lg">Iguaçu Auto Vidros</h3>
              <p className="text-xs text-blue-100">Responde em poucos segundos</p>
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
                        : "bg-blue-600 text-white"
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
                            className="block text-sm bg-blue-700 text-white hover:bg-blue-800 rounded px-3 py-2 text-center transition font-medium"
                          >
                            {link.label}
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
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
