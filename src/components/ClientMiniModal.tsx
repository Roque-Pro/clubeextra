import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ClientMiniModalProps {
    clientId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ClientMiniModal = ({ clientId, open, onOpenChange }: ClientMiniModalProps) => {
    const [client, setClient] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !clientId) return;
        let mounted = true;
        const fetchClient = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("clients")
                .select(`id, name, email, phone, vehicle, plate, plan_active, plan_end, client_vehicles(vehicle,plate,vehicle_photo_url)`)
                .eq("id", clientId)
                .single();

            if (mounted) {
                if (error) {
                    console.error("Erro ao buscar cliente no modal:", error);
                    setClient(null);
                } else {
                    setClient(data);
                }
                setLoading(false);
            }
        };

        fetchClient();
        return () => { mounted = false; };
    }, [open, clientId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Cliente</DialogTitle>
                </DialogHeader>

                <div className="p-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : client ? (
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-bold">{client.name}</p>
                                {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                                {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                            </div>

                            <div className="p-2 bg-muted/20 rounded">
                                <p className="text-xs font-medium">Veículo</p>
                                <p className="text-sm">{client.vehicle || (client.client_vehicles && client.client_vehicles.vehicle) || "—"}</p>
                                <p className="text-xs text-muted-foreground uppercase">{client.plate || (client.client_vehicles && client.client_vehicles.plate) || "—"}</p>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                <div>Plano: {client.plan_active ? "Ativo" : "Sem plano"}</div>
                                {client.plan_end && <div>Válido até: {new Date(client.plan_end).toLocaleDateString("pt-BR")}</div>}
                            </div>

                            <div className="flex justify-end">
                                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Cliente não encontrado</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ClientMiniModal;
