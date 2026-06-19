import { Calendar, TrendingUp, Users, CheckCircle, Clock, AlertCircle, Plus, Check, X, Edit, Video } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import ClientStatusBadge from "@/components/ClientStatusBadge";
import ClientMiniModal from "@/components/ClientMiniModal";
import { mockReplacements } from "@/data/mockData";
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Service } from "@/types";
import { mockEmployees } from "@/data/mockData";
import { logAction } from "@/lib/auditLog";

interface Employee {
    id: string;
    name: string;
    role: string;
    sales_count?: number;
    attendance_count?: number;
    installations_count?: number;
}

interface Client {
    id: string;
    name: string;
    vehicle: string;
    plate: string;
}

interface Appointment {
     id: string;
     client_id: string;
     client_name: string;
     client_plan_status?: "free" | "active" | "expired";
     service_type: string;
     scheduled_date: string;
     scheduled_time: string;
     status: string;
     notes?: string;
     vehicle_id?: string;
     vehicle?: string;
     plate?: string;
     vehicle_photo_url?: string;
     appointment_video_url?: string;
     original_scheduled_date?: string;
     original_scheduled_time?: string;
     time_changed_at?: string;
     time_change_reason?: string;
}

const getPlanStatus = (planActive: boolean, planEnd?: string): "free" | "active" | "expired" => {
    if (!planActive) return "free";

    if (planEnd) {
        const endDate = new Date(planEnd);
        const today = new Date();
        if (endDate < today) return "expired";
    }

    return "active";
};

const Servicos = () => {
    const { session, loading: authLoading } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actioningAppointmentId, setActioningAppointmentId] = useState<string | null>(null);
    const [isEmployee, setIsEmployee] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [activeTab, setActiveTab] = useState<"pendentes" | "concluidos">("pendentes");
    const [completeAppointmentDialogOpen, setCompleteAppointmentDialogOpen] = useState(false);
    const [selectedEmployeeForCompletion, setSelectedEmployeeForCompletion] = useState("");
    const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);
    const [editAppointmentDialogOpen, setEditAppointmentDialogOpen] = useState(false);
    const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
    const [editAppointmentForm, setEditAppointmentForm] = useState({
        scheduled_date: "",
        scheduled_time: "",
        reason: "",
    });
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>("");
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const { toast } = useToast();

    const [serviceForm, setServiceForm] = useState({
        clientId: "",
        clientType: "plano", // "plano" ou "avulso"
        serviceType: "",
        description: "",
        value: "",
        employeeId: "",
        installations: "",
        // Dados para cliente avulso
        clientName: "",
        clientVehicle: "",
        clientPlate: "",
    });

    const fetchData = async () => {
        try {
            const [empData, servData, clientData, userRoleData] = await Promise.all([
                supabase.from("employees").select("*").order("name", { ascending: false }),
                supabase.from("services").select("*").order("service_date", { ascending: false }),
                supabase.from("clients").select("id, name, vehicle, plate").order("name", { ascending: true }),
                session?.user?.id ? supabase.from("user_roles").select("role").eq("user_id", session.user.id).single() : Promise.resolve({ data: null }),
            ]);

            // Fetch appointments with vehicle info and client plan status
             const aptData = await supabase
                 .from("appointments")
                 .select(`
                     id,
                     client_id,
                     client_name,
                     service_type,
                     scheduled_date,
                     scheduled_time,
                     status,
                     notes,
                     vehicle_id,
                     appointment_video_url,
                     client_vehicles(vehicle, plate, vehicle_photo_url),
                     clients(plan_active, plan_end)
                 `)
                 .order("scheduled_date", { ascending: true });

            if (empData.error) throw empData.error;
            if (servData.error) throw servData.error;
            if (clientData.error) throw clientData.error;
            if (aptData.error) throw aptData.error;

            // Verificar se o usuário atual é um funcionário ou admin
            if (session?.user?.email) {
                const empCheck = empData.data?.some((emp: any) => emp.email === session.user.email);
                const isAdmin = userRoleData?.data?.role === "admin";

                if (!empCheck && !isAdmin) {
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }
                setIsEmployee(true);
            }

            // Map appointments to include vehicle info and client plan status
            const appointmentsWithVehicles = (aptData.data || []).map((apt: any) => ({
                ...apt,
                vehicle: apt.client_vehicles?.vehicle,
                plate: apt.client_vehicles?.plate,
                vehicle_photo_url: apt.client_vehicles?.vehicle_photo_url,
                client_plan_status: getPlanStatus(
                    Boolean(apt.clients?.plan_active),
                    apt.clients?.plan_end
                ),
            }));

            setEmployees(empData.data || []);
            setServices(servData.data || []);
            setAppointments(appointmentsWithVehicles);
            setClients(clientData.data || []);
        } catch (error: any) {
            console.error("Erro ao carregar dados:", error);
            toast({
                title: "Erro ao carregar dados",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleConfirmAppointment = async (appointmentId: string, appointment: Appointment) => {
        setActioningAppointmentId(appointmentId);
        try {
            const { error } = await supabase
                .from("appointments")
                .update({ status: "confirmado" })
                .eq("id", appointmentId);

            if (error) throw error;

            // Log da ação
            const vehicleInfo = appointment.vehicle ? ` - ${appointment.vehicle} (${appointment.plate})` : "";
            logAction("update", "appointments", appointmentId, appointment.client_name, `Agendamento confirmado: ${appointment.service_type}${vehicleInfo} para ${new Date(appointment.scheduled_date).toLocaleDateString("pt-BR")} às ${appointment.scheduled_time}`);

            fetchData();
            toast({ title: "Agendamento confirmado!" });
        } catch (err: any) {
            toast({
                title: "Erro ao confirmar agendamento",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setActioningAppointmentId(null);
        }
    };

    const openCompleteAppointmentDialog = (appointment: Appointment) => {
        setAppointmentToComplete(appointment);
        setSelectedEmployeeForCompletion("");
        setCompleteAppointmentDialogOpen(true);
    };

    const handleCompleteAppointment = async () => {
        if (!appointmentToComplete || !selectedEmployeeForCompletion) {
            toast({ title: "Selecione um funcionário", variant: "destructive" });
            return;
        }

        const appointmentId = appointmentToComplete.id;
        const appointment = appointmentToComplete;
        const selectedEmployee = employees.find((e) => e.id === selectedEmployeeForCompletion);

        setActioningAppointmentId(appointmentId);
        try {
            // Atualizar status do agendamento
            const { error: updateError } = await supabase
                .from("appointments")
                .update({ status: "concluído" })
                .eq("id", appointmentId);

            if (updateError) throw updateError;

            // Registrar a troca na tabela replacements
            const { error: replError } = await supabase
                .from("replacements")
                .insert({
                    client_id: appointment.client_id,
                    client_name: appointment.client_name,
                    item: appointment.service_type,
                    date: new Date().toISOString().split("T")[0],
                    employee_id: selectedEmployee?.id || null,
                    employee_name: selectedEmployee?.name || "Não definido",
                    notes: appointment.notes || "",
                });

            if (replError) throw replError;

            // Registrar também na tabela services para contar nos indicadores
            const { error: serviceError } = await supabase
                .from("services")
                .insert({
                    client_id: appointment.client_id,
                    client_name: appointment.client_name,
                    service_type: appointment.service_type,
                    service_date: new Date().toISOString().split("T")[0],
                    employee_id: selectedEmployee?.id || null,
                    employee_name: selectedEmployee?.name || "Não definido",
                    value: 0,
                    installations: 0,
                    notes: appointment.notes || "",
                });

            if (serviceError) throw serviceError;

            // Log da ação
            const vehicleInfoComplete = appointment.vehicle ? ` - ${appointment.vehicle} (${appointment.plate})` : "";
            logAction("register", "replacements", appointmentId, appointment.client_name, `Agendamento concluído e troca registrada: ${appointment.service_type}${vehicleInfoComplete} - Responsável: ${selectedEmployee?.name}`);

            setCompleteAppointmentDialogOpen(false);
             fetchData();
             toast({ title: "Serviço concluído e registrado com sucesso!" });
            } catch (err: any) {
             toast({
                 title: "Erro ao concluir agendamento",
                 description: err.message,
                 variant: "destructive",
             });
            } finally {
             setActioningAppointmentId(null);
            }
            };

            const openEditAppointmentDialog = (appointment: Appointment) => {
            // Garantir formato correto da data (YYYY-MM-DD)
            const dateStr = typeof appointment.scheduled_date === 'string' 
                ? appointment.scheduled_date.split('T')[0] 
                : appointment.scheduled_date;
            
            setAppointmentToEdit(appointment);
            setEditAppointmentForm({
             scheduled_date: dateStr,
             scheduled_time: appointment.scheduled_time,
             reason: "",
            });
            setEditAppointmentDialogOpen(true);
            };

            const handleEditAppointment = async () => {
            if (!appointmentToEdit || !editAppointmentForm.scheduled_date || !editAppointmentForm.scheduled_time) {
             toast({ title: "Preencha data e hora", variant: "destructive" });
             return;
            }

            setActioningAppointmentId(appointmentToEdit.id);
            try {
             // Corrigir timezone: adicionar 1 dia à data
             const dateObj = new Date(editAppointmentForm.scheduled_date);
             dateObj.setDate(dateObj.getDate() + 1);
             const newDate = dateObj.toISOString().split('T')[0];
             
             console.log("📅 ANTES DE ENVIAR:");
             console.log("Input date do formulário:", editAppointmentForm.scheduled_date);
             console.log("Data corrigida com timezone:", newDate);
             
             // Se a data/hora mudou, atualizar com rastreamento
             const dateChanged = newDate !== appointmentToEdit.scheduled_date;
             const timeChanged = editAppointmentForm.scheduled_time !== appointmentToEdit.scheduled_time;

             if (dateChanged || timeChanged) {
                 console.log("📤 ENVIANDO PARA SUPABASE:");
                 console.log("scheduled_date CORRIGIDA:", newDate);
                 console.log("scheduled_time:", editAppointmentForm.scheduled_time);
                 
                 const { error } = await supabase
                     .from("appointments")
                     .update({
                         scheduled_date: newDate,
                         scheduled_time: editAppointmentForm.scheduled_time,
                         original_scheduled_date: appointmentToEdit.original_scheduled_date || appointmentToEdit.scheduled_date,
                         original_scheduled_time: appointmentToEdit.original_scheduled_time || appointmentToEdit.scheduled_time,
                         time_changed_at: new Date().toISOString(),
                         time_change_reason: editAppointmentForm.reason || "Mudança de disponibilidade",
                     })
                     .eq("id", appointmentToEdit.id);

                 if (error) throw error;

                 // Log da ação
                 const oldTime = `${appointmentToEdit.scheduled_date} ${appointmentToEdit.scheduled_time}`;
                 const newTime = `${newDate} ${editAppointmentForm.scheduled_time}`;
                 logAction("update", "appointments", appointmentToEdit.id, appointmentToEdit.client_name, `Horário alterado de ${oldTime} para ${newTime}. Motivo: ${editAppointmentForm.reason || "Não informado"}`);

                 setEditAppointmentDialogOpen(false);
                 fetchData();
                 toast({ title: "Horário do agendamento alterado com sucesso!" });
             } else {
                 toast({ title: "Nenhuma alteração foi feita", variant: "destructive" });
             }
            } catch (err: any) {
             toast({
                 title: "Erro ao alterar agendamento",
                 description: err.message,
                 variant: "destructive",
             });
            } finally {
             setActioningAppointmentId(null);
            }
            };

            const handleAddService = async () => {
        if (!serviceForm.serviceType || !serviceForm.employeeId) {
            toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const employee = employees.find((e) => e.id === serviceForm.employeeId);

            if (!employee) {
                toast({ title: "Funcionário não encontrado", variant: "destructive" });
                return;
            }

            let clientId = serviceForm.clientId;
            let clientName = "";
            let clientVehicle = "";
            let clientPlate = "";

            // Se é cliente avulso, criar novo cliente
            if (serviceForm.clientType === "avulso") {
                if (!serviceForm.clientName || !serviceForm.clientPlate) {
                    toast({ title: "Para cliente avulso, preencha nome e placa", variant: "destructive" });
                    return;
                }

                const clientData = {
                    name: serviceForm.clientName,
                    vehicle: serviceForm.clientVehicle || "Veículo",
                    plate: serviceForm.clientPlate,
                    phone: "",
                    email: `avulso-${serviceForm.clientPlate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@clubedovidro.local`,
                    plan_start: new Date().toISOString().split("T")[0],
                    plan_end: new Date().toISOString().split("T")[0],
                };

                console.log("Criando cliente avulso:", clientData);

                const { data: newClient, error: clientError } = await supabase
                    .from("clients")
                    .insert(clientData)
                    .select()
                    .single();

                console.log("Resposta do servidor:", { newClient, clientError });

                if (clientError) {
                    console.error("Erro ao criar cliente:", clientError);
                    throw new Error(`Erro ao criar cliente: ${clientError.message}`);
                }

                clientId = newClient.id;
                clientName = newClient.name;
                clientVehicle = newClient.vehicle;
                clientPlate = newClient.plate;
            } else {
                // Cliente de plano
                if (!serviceForm.clientId) {
                    toast({ title: "Selecione um cliente", variant: "destructive" });
                    return;
                }

                const client = clients.find((c) => c.id === serviceForm.clientId);
                if (!client) {
                    toast({ title: "Cliente não encontrado", variant: "destructive" });
                    return;
                }

                clientName = client.name;
                clientVehicle = client.vehicle;
                clientPlate = client.plate;
            }

            const { data, error } = await supabase
                .from("services")
                .insert({
                    client_id: clientId,
                    client_name: clientName,
                    vehicle: clientVehicle,
                    plate: clientPlate,
                    service_type: serviceForm.serviceType,
                    description: serviceForm.description,
                    value: parseFloat(serviceForm.value) || 0,
                    employee_id: serviceForm.employeeId,
                    employee_name: employee.name,
                    installations: parseInt(serviceForm.installations) || 0,
                    service_date: new Date().toISOString().split("T")[0],
                })
                .select();

            if (error) throw error;

            if (data) {
                setServices([data[0], ...services]);

                // Log da ação
                logAction("create", "services", data[0].id, clientName, `Serviço: ${serviceForm.serviceType} - R$ ${serviceForm.value}`);

                // Sinaliza que houve uma nova venda para a aba de comissões atualizar
                localStorage.setItem('serviceCreated', new Date().toISOString());

                toast({ title: "Serviço registrado com sucesso!" });
                fetchData(); // Recarrega clientes
                setServiceForm({
                    clientId: "",
                    clientType: "plano",
                    serviceType: "",
                    description: "",
                    value: "",
                    employeeId: "",
                    installations: "",
                    clientName: "",
                    clientVehicle: "",
                    clientPlate: "",
                });
                setDialogOpen(false);
            }
        } catch (error: any) {
            toast({
                title: "Erro ao registrar serviço",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Cálculos de índices de serviços
    const today = new Date().toISOString().split("T")[0];
    const todayServices = services.filter((s) => s.service_date === today);
    const totalServices = todayServices.length;
    const totalInstallations = employees.reduce((sum, e) => sum + (e.installations_count || 0), 0);
    const totalAttendances = employees.reduce((sum, e) => sum + (e.attendance_count || 0), 0);
    const totalSales = employees.reduce((sum, e) => sum + (e.sales_count || 0), 0);

    useEffect(() => {
        const checkMidnight = setInterval(() => {
            setServices([...services]);
        }, 1000);
        return () => clearInterval(checkMidnight);
    }, [services]);

    const recentServices = [...services]
        .sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())
        .slice(0, 8);

    const topInstaller = employees.length > 0
        ? [...employees].sort((a, b) => (b.installations_count || 0) - (a.installations_count || 0))[0]
        : null;

    const topAttendant = employees.length > 0
        ? [...employees].sort((a, b) => (b.attendance_count || 0) - (a.attendance_count || 0))[0]
        : null;

    const topSeller = employees.length > 0
        ? [...employees].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))[0]
        : null;

    // Top 3 funcionários mais serviços (todos os tempos)
    const employeeServices = services.reduce((acc: { [key: string]: number }, service) => {
        acc[service.employee_name] = (acc[service.employee_name] || 0) + 1;
        return acc;
    }, {});

    const top3Employees = Object.entries(employeeServices)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

    // Top 3 funcionários de hoje
    const todayEmployeeServices = todayServices.reduce((acc: { [key: string]: number }, service) => {
        acc[service.employee_name] = (acc[service.employee_name] || 0) + 1;
        return acc;
    }, {});

    const top3EmployeesToday = Object.entries(todayEmployeeServices)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center glow-primary">
                        <Calendar className="w-6 h-6 text-primary-foreground" />
                    </div>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return <Navigate to="/client-dashboard" replace />;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageHeader title="Serviços" description="Gerencie agendamentos e acompanhe o desempenho da equipe em tempo real" />
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-medium text-primary">Sistema Ativo</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LADO ESQUERDO - AGENDAMENTOS (7 Colunas) */}
                <div className="lg:col-span-7 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card overflow-hidden rounded-2xl border border-border shadow-lg"
                    >
                        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                            <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Calendar className="w-5 h-5 text-primary" />
                                </div>
                                Gestão de Agendamentos
                            </h2>
                            
                            {/* Abas Estilizadas */}
                            <div className="flex bg-background/50 p-1 rounded-xl border border-border">
                                <button
                                    onClick={() => setActiveTab("pendentes")}
                                    className={`px-4 py-1.5 rounded-lg font-medium transition-all text-sm ${activeTab === "pendentes"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    Agendados
                                </button>
                                <button
                                    onClick={() => setActiveTab("concluidos")}
                                    className={`px-4 py-1.5 rounded-lg font-medium transition-all text-sm ${activeTab === "concluidos"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    Concluídos
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {activeTab === "pendentes" ? (
                                appointments.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Calendar className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <p className="text-muted-foreground">Nenhum agendamento para exibir</p>
                                    </div>
                                ) : (
                                    appointments
                                        .filter((apt) => apt.status !== "cancelado" && apt.status !== "concluído")
                                        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                                        .map((apt) => {
                                            const isPendente = apt.status === "pendente";
                                            return (
                                                <div 
                                                    key={apt.id} 
                                                    className={`group p-4 rounded-xl border transition-all hover:shadow-md ${
                                                        isPendente 
                                                            ? "bg-amber-50/40 border-amber-100 hover:border-amber-300 dark:bg-amber-950/10 dark:border-amber-900/30" 
                                                            : "bg-blue-50/40 border-blue-100 hover:border-blue-300 dark:bg-blue-950/10 dark:border-blue-900/30"
                                                    }`}
                                                >
                                                     <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                                         <div className="flex-1 space-y-2">
                                                              <div className="flex items-center gap-2">
                                                                                                  <div className="flex items-center gap-2">
                                                                                                      <button
                                                                                                          onClick={() => { setSelectedClientId(apt.client_id); setClientModalOpen(true); }}
                                                                                                          className="font-semibold text-foreground truncate underline underline-offset-2 decoration-dotted text-left"
                                                                                                      >
                                                                                                          {apt.client_name}
                                                                                                      </button>
                                                                                                      <ClientStatusBadge 
                                                                                                          planStatus={apt.client_plan_status}
                                                                                                          size="md"
                                                                                                      />
                                                                                                  </div>
                                                                  {apt.time_changed_at && (
                                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 animate-pulse">
                                                                        <Clock className="w-3 h-3" /> HORÁRIO ALTERADO
                                                                    </span>
                                                                  )}
                                                              </div>

                                                             <div className="flex flex-wrap items-center gap-3 text-sm">
                                                                <span className="flex items-center gap-1.5 text-foreground font-medium">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                    {apt.service_type}
                                                                </span>
                                                                <span className="text-muted-foreground flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {new Date(apt.scheduled_date).toLocaleDateString("pt-BR")}
                                                                </span>
                                                                <span className="text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {apt.scheduled_time}
                                                                </span>
                                                             </div>

                                                             {apt.vehicle && (
                                                                 <div className="flex items-center gap-3 p-2 bg-background/50 rounded-lg border border-border/50">
                                                                     {apt.vehicle_photo_url && (
                                                                         <button
                                                                             onClick={() => {
                                                                                 setSelectedPhotoUrl(apt.vehicle_photo_url || "");
                                                                                 setPhotoModalOpen(true);
                                                                             }}
                                                                             className="relative w-10 h-10 rounded-md overflow-hidden hover:ring-2 ring-primary transition-all"
                                                                         >
                                                                             <img
                                                                                 src={apt.vehicle_photo_url}
                                                                                 alt={apt.vehicle}
                                                                                 className="w-full h-full object-cover"
                                                                             />
                                                                         </button>
                                                                     )}
                                                                     <div>
                                                                        <p className="text-xs font-bold text-foreground">{apt.vehicle}</p>
                                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{apt.plate}</p>
                                                                     </div>
                                                                 </div>
                                                             )}
                                                             
                                                             {apt.notes && (
                                                                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg italic">
                                                                    "{apt.notes}"
                                                                </p>
                                                             )}

                                                             {apt.appointment_video_url && (
                                                                 <Button
                                                                     variant="ghost"
                                                                     size="sm"
                                                                     onClick={() => {
                                                                         setSelectedVideoUrl(apt.appointment_video_url || "");
                                                                         setVideoModalOpen(true);
                                                                     }}
                                                                     className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2"
                                                                 >
                                                                     <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                                                                        <Video className="w-4 h-4 text-blue-600" />
                                                                     </div>
                                                                     Ver Vídeo do Problema
                                                                 </Button>
                                                             )}
                                                         </div>

                                                        <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                                                             <div className={`px-3 py-1 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
                                                                isPendente ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                                             }`}>
                                                                 {isPendente ? <Clock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                                 {isPendente ? "Pendente" : "Confirmado"}
                                                             </div>

                                                             <div className="grid grid-cols-2 md:grid-cols-1 gap-2 flex-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-xs h-9 gap-2"
                                                                    onClick={() => openEditAppointmentDialog(apt)}
                                                                    disabled={actioningAppointmentId === apt.id}
                                                                >
                                                                    <Edit className="w-3 h-3" /> Horário
                                                                </Button>
                                                                
                                                                {isPendente ? (
                                                                    <Button
                                                                        size="sm"
                                                                        className="text-xs h-9 gap-2 gradient-primary"
                                                                        onClick={() => handleConfirmAppointment(apt.id, apt)}
                                                                        disabled={actioningAppointmentId === apt.id}
                                                                    >
                                                                        <Check className="w-3 h-3" /> Confirmar
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        className="text-xs h-9 gap-2 bg-green-600 hover:bg-green-700 text-white"
                                                                        onClick={() => openCompleteAppointmentDialog(apt)}
                                                                        disabled={actioningAppointmentId === apt.id}
                                                                    >
                                                                        <CheckCircle className="w-3 h-3" /> Concluir
                                                                    </Button>
                                                                )}
                                                             </div>
                                                         </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                )
                            ) : (
                                // Aba Concluídos
                                appointments.filter((apt) => apt.status === "concluído").length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground">Nenhum serviço concluído</p>
                                    </div>
                                ) : (
                                    appointments
                                        .filter((apt) => apt.status === "concluído")
                                        .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
                                        .map((apt) => (
                                            <div key={apt.id} className="p-4 rounded-xl border border-green-100 bg-green-50/30 dark:border-green-900/30 dark:bg-green-950/10">
                                                 <div className="flex items-start justify-between gap-4">
                                                     <div className="flex-1 space-y-2">
                                                          <div className="flex items-center gap-2">
                                                              <button
                                                                  onClick={() => { setSelectedClientId(apt.client_id); setClientModalOpen(true); }}
                                                                  className="font-semibold text-foreground truncate underline underline-offset-2 decoration-dotted text-left"
                                                              >
                                                                  {apt.client_name}
                                                              </button>
                                                              <ClientStatusBadge 
                                                                  planStatus={apt.client_plan_status}
                                                                  size="md"
                                                              />
                                                          </div>
                                                         <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            {apt.service_type}
                                                         </div>
                                                         <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(apt.scheduled_date).toLocaleDateString("pt-BR")}</span>
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {apt.scheduled_time}</span>
                                                         </div>
                                                     </div>
                                                     <div className="flex flex-col items-end gap-2">
                                                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1.5">
                                                            <CheckCircle className="w-3 h-3" /> Concluído
                                                        </span>
                                                     </div>
                                                </div>
                                            </div>
                                        ))
                                )
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* LADO DIREITO - ÍNDICES E TOP (5 Colunas) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Card de Registro Rápido */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div>
                                <p className="text-sm text-muted-foreground">Total de Serviços Realizados</p>
                                <h3 className="text-4xl font-display font-black text-primary tracking-tight">
                                    {totalServices}
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">Hoje - {new Date().toLocaleDateString("pt-BR")}</p>
                            </div>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-14 w-14 rounded-2xl shadow-lg glow-primary gradient-primary p-0 flex items-center justify-center">
                                        <Plus className="w-8 h-8 text-white" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card border-border max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="font-display">Registrar Novo Serviço</DialogTitle>
                                        <DialogDescription>
                                            Informe os detalhes do serviço realizado para registro no sistema.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Tipo de Cliente *</Label>
                                            <Select value={serviceForm.clientType} onValueChange={(v) => setServiceForm({ ...serviceForm, clientType: v as "plano" | "avulso", clientId: "", clientName: "", clientVehicle: "", clientPlate: "" })}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="plano">Cliente de Plano</SelectItem>
                                                    <SelectItem value="avulso">Cliente Avulso</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {serviceForm.clientType === "plano" ? (
                                            <div>
                                                <Label>Cliente *</Label>
                                                <Select value={serviceForm.clientId} onValueChange={(v) => setServiceForm({ ...serviceForm, clientId: v })}>
                                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {clients.map((client) => (
                                                            <SelectItem key={client.id} value={client.id}>
                                                                {client.name} ({client.plate})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <Label>Nome do Cliente *</Label>
                                                    <Input
                                                        value={serviceForm.clientName}
                                                        onChange={(e) => setServiceForm({ ...serviceForm, clientName: e.target.value })}
                                                        placeholder="Nome completo"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label>Veículo</Label>
                                                        <Input
                                                            value={serviceForm.clientVehicle}
                                                            onChange={(e) => setServiceForm({ ...serviceForm, clientVehicle: e.target.value })}
                                                            placeholder="Modelo"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Placa *</Label>
                                                        <Input
                                                            value={serviceForm.clientPlate}
                                                            onChange={(e) => setServiceForm({ ...serviceForm, clientPlate: e.target.value })}
                                                            placeholder="ABC-1234"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <Label>Tipo de Serviço *</Label>
                                            <Input
                                                value={serviceForm.serviceType}
                                                onChange={(e) => setServiceForm({ ...serviceForm, serviceType: e.target.value })}
                                                placeholder="Ex: Instalação, Polimento, etc"
                                            />
                                        </div>
                                        <div>
                                            <Label>O que foi feito</Label>
                                            <Input
                                                value={serviceForm.description}
                                                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                                                placeholder="Descrição detalhada do serviço"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label>Valor (R$)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={serviceForm.value}
                                                    onChange={(e) => setServiceForm({ ...serviceForm, value: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <Label>Instalações</Label>
                                                <Input
                                                    type="number"
                                                    value={serviceForm.installations}
                                                    onChange={(e) => setServiceForm({ ...serviceForm, installations: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Funcionário *</Label>
                                            <Select value={serviceForm.employeeId} onValueChange={(v) => setServiceForm({ ...serviceForm, employeeId: v })}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    {employees.filter((e) => e).map((emp) => (
                                                        <SelectItem key={emp.id} value={emp.id}>
                                                            {emp.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            onClick={handleAddService}
                                            disabled={submitting}
                                            className="w-full gradient-primary text-primary-foreground font-semibold h-12 rounded-xl shadow-lg glow-primary"
                                        >
                                            {submitting ? "Registrando..." : "Registrar Serviço Realizado"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </motion.div>

                    {/* Top 3 de Hoje */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-6 rounded-2xl border border-border"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <Plus className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-display font-bold text-foreground">Destaques de Hoje</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {top3EmployeesToday.length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
                                    <p className="text-sm text-muted-foreground italic">Nenhum serviço registrado hoje</p>
                                </div>
                            ) : (
                                top3EmployeesToday.map((employee, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between group hover:bg-muted/50 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{employee.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Performance Hoje</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-primary tracking-tight leading-none">{employee.count}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">SERVIÇOS</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>

                    {/* Top Performers Geral */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-6 rounded-2xl border border-border bg-muted/10"
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <Plus className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-display font-bold text-foreground">Ranking Geral</h3>
                        </div>

                        <div className="space-y-3">
                            {top3Employees.map((employee, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-background border border-border flex items-center justify-between relative overflow-hidden group hover:border-primary/50 transition-all">
                                    {idx === 0 && <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/10 rounded-full -mr-6 -mt-6 blur-xl group-hover:bg-amber-500/20 transition-all" />}
                                    
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                            idx === 0 ? "bg-amber-100 text-amber-600 border border-amber-200" :
                                            idx === 1 ? "bg-slate-100 text-slate-600 border border-slate-200" :
                                            "bg-orange-100 text-orange-600 border border-orange-200"
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{employee.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Líder de Execução</p>
                                        </div>
                                    </div>
                                    <div className="text-right z-10">
                                        <p className="text-2xl font-black text-foreground group-hover:text-primary transition-colors tracking-tight leading-none">{employee.count}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold italic">TOTAL</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Modal para Concluir Agendamento */}
            <Dialog open={completeAppointmentDialogOpen} onOpenChange={setCompleteAppointmentDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Concluir Agendamento</DialogTitle>
                        <DialogDescription>
                            Confirme a conclusão do serviço e selecione o funcionário responsável.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Funcionário Responsável *</Label>
                            <Select value={selectedEmployeeForCompletion} onValueChange={setSelectedEmployeeForCompletion}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o funcionário" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button 
                            onClick={handleCompleteAppointment} 
                            className="w-full gradient-primary"
                            disabled={actioningAppointmentId !== null}
                        >
                            {actioningAppointmentId ? "Processando..." : "Confirmar Conclusão"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal para Editar Horário */}
            <Dialog open={editAppointmentDialogOpen} onOpenChange={setEditAppointmentDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Alterar Horário</DialogTitle>
                        <DialogDescription>
                            Selecione a nova data e hora para o agendamento.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nova Data</Label>
                                <Input 
                                    type="date" 
                                    value={editAppointmentForm.scheduled_date}
                                    onChange={(e) => setEditAppointmentForm({...editAppointmentForm, scheduled_date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nova Hora</Label>
                                <Input 
                                    type="time" 
                                    value={editAppointmentForm.scheduled_time}
                                    onChange={(e) => setEditAppointmentForm({...editAppointmentForm, scheduled_time: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo da Alteração</Label>
                            <Input 
                                placeholder="Ex: Mudança de disponibilidade"
                                value={editAppointmentForm.reason}
                                onChange={(e) => setEditAppointmentForm({...editAppointmentForm, reason: e.target.value})}
                            />
                        </div>
                        <Button 
                            onClick={handleEditAppointment} 
                            className="w-full gradient-primary"
                            disabled={actioningAppointmentId !== null}
                        >
                            {actioningAppointmentId ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal para Visualizar Vídeo do Agendamento */}
            <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
                <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-display">Vídeo do Problema</DialogTitle>
                        <DialogDescription>
                            Assista ao vídeo enviado pelo cliente para entender melhor a solicitação.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex justify-center items-center bg-black rounded-lg overflow-hidden">
                            <video
                                src={selectedVideoUrl}
                                controls
                                className="max-w-full max-h-96"
                            />
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                            <div>
                                <h4 className="font-semibold text-foreground mb-2">Por que o vídeo é importante?</h4>
                                <p className="text-sm text-muted-foreground">
                                    O cliente documenta o problema do veículo antes do atendimento, permitindo que nossa equipe entenda melhor a situação e se prepare adequadamente com os materiais e ferramentas corretos.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground mb-2">Fluxo</h4>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Cliente grava vídeo mostrando o problema</li>
                                    <li>Anexa na criação do agendamento</li>
                                    <li>Você analisa antes do atendimento aqui</li>
                                    <li>Prepara-se com materiais e ferramentas adequados</li>
                                </ul>
                            </div>
                            <div className="pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground italic">
                                    💡 Qualidade: Verifique se a iluminação é boa, se o problema é visível por diferentes ângulos e se há som.
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal para Visualizar Foto do Veículo */}
            <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
                <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-display">Foto do Veículo</DialogTitle>
                        <DialogDescription>
                            Visualização da foto do veículo enviada pelo cliente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center">
                        <img
                            src={selectedPhotoUrl}
                            alt="Veículo"
                            className="max-w-full max-h-96 rounded-lg object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <ClientMiniModal clientId={selectedClientId} open={clientModalOpen} onOpenChange={setClientModalOpen} />
        </div>
    );
};

export default Servicos;
