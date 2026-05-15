import { VistoriaTab } from "@/components/VistoriaTab";
import PageHeader from "@/components/PageHeader";

const Vistoria = () => {
  return (
    <div className="container mx-auto pb-8">
      <PageHeader 
        title="Vistoria de Veículos" 
        description="Analise fotos e autorize a participação de novos veículos e clientes no clube."
      />
      <div className="mt-6">
        <VistoriaTab />
      </div>
    </div>
  );
};

export default Vistoria;
