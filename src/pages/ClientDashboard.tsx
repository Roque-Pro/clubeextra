import { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, Edit, Save, X, Mail, Phone, User, Car, LogOut, Calendar, Plus, Trash2, Check, AlertCircle, Upload, Image } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVehicleValidation } from "@/hooks/useVehicleValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BulkVehicleUpload } from "@/components/BulkVehicleUpload";

interface ClientProfile {
     id?: string;
     name: string;
     email: string;
     phone: string;
     cpf: string;
     vehicle: string;
     plate: string;
     replacements_used?: number;
     max_replacements?: number;
     plan_active?: boolean;
     plan_paid_at?: string;
     plan_start?: string;
     plan_end?: string;
}

interface ClientVehicle {
     id: string;
     vehicle: string;
     plate: string;
     is_national: boolean;
     is_primary: boolean;
     vehicle_photo_url?: string;
}

interface Appointment {
    id: string;
    client_id: string;
    client_name: string;
    service_type: string;
    scheduled_date: string;
    scheduled_time: string;
    status: string;
    notes?: string;
    vehicle_id?: string;
    original_scheduled_date?: string;
    original_scheduled_time?: string;
    time_changed_at?: string;
    time_change_reason?: string;
}

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() || "";
const normalizeCpf = (value?: string | null) => value?.trim() || "";
const normalizePlate = (value?: string | null) => value?.trim().toUpperCase() || "";

const ClientDashboard = () => {
    const navigate = useNavigate();
    const { session, loading, user, signOut } = useAuth();
    const { toast } = useToast();
    const { validateVehicle, loading: validatingVehicle } = useVehicleValidation();
    const [clientData, setClientData] = useState<ClientProfile | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [editingSection, setEditingSection] = useState<"personal" | "vehicle" | null>(null);
    const [formData, setFormData] = useState<ClientProfile>({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        vehicle: "",
        plate: "",
    });
    const [saving, setSaving] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
    const [submittingAppointment, setSubmittingAppointment] = useState(false);
    const [appointmentForm, setAppointmentForm] = useState({
        service_type: "",
        scheduled_date: "",
        scheduled_time: "",
        notes: "",
        vehicle_id: "",
        videoFile: null as File | null,
    });
    const [appointmentVideoPreview, setAppointmentVideoPreview] = useState<string>("");
    const [uploadingAppointmentVideo, setUploadingAppointmentVideo] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");
    const [clientVehicles, setClientVehicles] = useState<ClientVehicle[]>([]);
    const [addVehicleDialogOpen, setAddVehicleDialogOpen] = useState(false);
    const [newVehicleForm, setNewVehicleForm] = useState({ vehicle: "", plate: "", photoFile: null as File | null });
    const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string>("");
    const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false);
    const [validatingNewVehicle, setValidatingNewVehicle] = useState(false);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [editAppointmentDialogOpen, setEditAppointmentDialogOpen] = useState(false);
    const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
    const [editAppointmentForm, setEditAppointmentForm] = useState({
        scheduled_date: "",
        scheduled_time: "",
    });
    const [submittingEditAppointment, setSubmittingEditAppointment] = useState(false);
    const [confirmingChangedAppointmentId, setConfirmingChangedAppointmentId] = useState<string | null>(null);
    const [bulkUploadEnabled, setBulkUploadEnabled] = useState(false);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>("");

    const replacementItems = ["Para-brisa", "Retrovisor", "Vigia", "Farol", "Janela", "Porta", "Óculos", "Insumo", "Ferramenta", "Outro"];

    // All hooks must be called before any conditional logic below

    // Fetch client vehicles
    const fetchClientVehicles = useCallback(async (clientId: string) => {
        try {
            const { data, error } = await supabase
                .from("client_vehicles")
                .select("*")
                .eq("client_id", clientId)
                .order("is_primary", { ascending: false });

            if (error) throw error;
            setClientVehicles(data || []);
        } catch (err) {
            console.error("Erro ao carregar veículos:", err);
        }
    }, []);

    // Fetch appointments callback
    const fetchAppointments = useCallback(async (clientId: string) => {
        try {
            const { data, error } = await supabase
                .from("appointments")
                .select("*")
                .eq("client_id", clientId)
                .order("scheduled_date", { ascending: false });

            if (error) throw error;
            setAppointments(data || []);
        } catch (err) {
            console.error("Erro ao carregar agendamentos:", err);
        }
    }, []);

    // Fetch client profile data and appointments
    useEffect(() => {
        const fetchClientData = async () => {
            try {
                const userId = session.user?.id;
                const userEmail = session.user?.email;


                if (!userId) {
                    setDataLoading(false);
                    return;
                }

                // Buscar cliente: primeiro por user_id, depois por email
                let clientRecord: any = null;

                // 1. Tentar por user_id
                const { data: byUserId } = await supabase
                    .from("clients")
                    .select("*")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (byUserId) {
                    clientRecord = byUserId;
                } else {
                    // 2. Fallback: buscar por email
                    const normalizedEmail = normalizeEmail(userEmail);
                    const { data: byEmail } = await supabase
                        .from("clients")
                        .select("*")
                        .eq("email", normalizedEmail)
                        .maybeSingle();

                    if (byEmail) {
                        clientRecord = byEmail;

                        // Vincula o cadastro legado ao usuário autenticado para evitar
                        // futuros fallbacks por email e garantir persistência correta.
                        if (!byEmail.user_id || byEmail.user_id !== userId) {
                            const { error: linkError } = await supabase
                                .from("clients")
                                .update({ user_id: userId })
                                .eq("id", byEmail.id);

                            if (!linkError) {
                                clientRecord = { ...byEmail, user_id: userId };
                            }
                        }
                    }
                }

                if (clientRecord) {
                    setClientData(clientRecord);
                    setFormData({
                        ...clientRecord,
                        cpf: clientRecord.cpf || "",
                        plate: clientRecord.plate || "",
                        phone: clientRecord.phone || "",
                        vehicle: clientRecord.vehicle || "",
                    });
                    setBulkUploadEnabled(clientRecord.bulk_upload_enabled || false);
                    fetchAppointments(clientRecord.id);
                    fetchClientVehicles(clientRecord.id);
                } else {
                    setClientData(null);
                }
            } catch (err) {
                setClientData(null);
            } finally {
                setDataLoading(false);
            }
        };

        if (session?.user?.id) {
            fetchClientData();
        } else {
            setDataLoading(false);
        }
    }, [session, fetchAppointments, fetchClientVehicles]);

    // Auto-refresh appointments every 30 seconds
    useEffect(() => {
        if (!clientData?.id) {
            return;
        }

        const interval = setInterval(() => {
            fetchAppointments(clientData.id!);
        }, 30000);

        return () => clearInterval(interval);
    }, [clientData?.id, fetchAppointments]);

    const handleVehiclePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith("image/")) {
            toast({ title: "Selecione uma imagem válida", variant: "destructive" });
            return;
        }

        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
            return;
        }

        setNewVehicleForm({ ...newVehicleForm, photoFile: file });
        
        // Criar preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setVehiclePhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadVehiclePhoto = async (file: File, clientId: string, plate: string): Promise<string | null> => {
        try {
            setUploadingVehiclePhoto(true);
            
            // Nome do arquivo: client_id/plate_timestamp.ext
            const fileExt = file.name.split(".").pop();
            const fileName = `${clientId}/${plate}_${Date.now()}.${fileExt}`;
            
            const { error, data } = await supabase.storage
                .from("vehicle-photos")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (error) {
                console.error("Erro ao upload foto:", error);
                return null;
            }

            // Obter URL pública
            const { data: publicData } = supabase.storage
                .from("vehicle-photos")
                .getPublicUrl(fileName);

            return publicData?.publicUrl || null;
        } catch (err: any) {
            console.error("Erro ao upload:", err);
            return null;
        } finally {
            setUploadingVehiclePhoto(false);
        }
    };

    const handleValidateAndAddVehicle = async () => {
        if (!newVehicleForm.vehicle || !newVehicleForm.plate) {
            toast({ title: "Preencha veículo e placa", variant: "destructive" });
            return;
        }

        if (!newVehicleForm.photoFile) {
            toast({ title: "Foto do veículo é obrigatória", variant: "destructive" });
            return;
        }

        if (!clientData) return;

        setValidatingNewVehicle(true);
        try {
            const result = await validateVehicle(newVehicleForm.vehicle);

            if (!result) {
                toast({ title: "Erro ao validar veículo", variant: "destructive" });
                return;
            }

            if (!result.isNational) {
                toast({
                    title: "Veículo importado",
                    description: "Apenas veículos nacionais podem ser adicionados ao plano",
                    variant: "destructive",
                });
                return;
            }

            setValidationResult(result);
        } catch (err: any) {
            toast({
                title: "Erro ao validar",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setValidatingNewVehicle(false);
        }
    };

    const handleConfirmAddVehicle = async () => {
        if (!clientData || !validationResult || !newVehicleForm.photoFile) return;

        try {
            setUploadingVehiclePhoto(true);
            
            // Upload da foto
            const photoUrl = await uploadVehiclePhoto(
                newVehicleForm.photoFile,
                clientData.id,
                newVehicleForm.plate
            );

            if (!photoUrl) {
                toast({
                    title: "Erro ao fazer upload da foto",
                    description: "Tente novamente com uma imagem diferente",
                    variant: "destructive",
                });
                return;
            }

            const isPrimary = clientVehicles.length === 0;

            const { error } = await supabase
                .from("client_vehicles")
                .insert({
                    client_id: clientData.id,
                    vehicle: newVehicleForm.vehicle,
                    plate: newVehicleForm.plate,
                    is_national: true,
                    is_primary: isPrimary,
                    vehicle_photo_url: photoUrl,
                });

            if (error) throw error;

            setNewVehicleForm({ vehicle: "", plate: "", photoFile: null });
            setVehiclePhotoPreview("");
            setValidationResult(null);
            setAddVehicleDialogOpen(false);
            fetchClientVehicles(clientData.id);
            toast({ title: "Veículo adicionado com sucesso!" });
        } catch (err: any) {
            toast({
                title: "Erro ao adicionar veículo",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setUploadingVehiclePhoto(false);
        }
    };

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!clientData) return;

        try {
            // Buscar veículo para obter a URL da foto
            const { data: vehicleData, error: fetchError } = await supabase
                .from("client_vehicles")
                .select("vehicle_photo_url")
                .eq("id", vehicleId)
                .single();

            if (fetchError) {
                console.error("Erro ao buscar veículo:", fetchError);
                throw fetchError;
            }

            // Deletar foto do Storage se existir
            if (vehicleData?.vehicle_photo_url) {
                try {
                    // Extrair o caminho do arquivo da URL
                    const urlParts = vehicleData.vehicle_photo_url.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    const clientPath = urlParts[urlParts.length - 2];
                    const filePath = `${clientPath}/${fileName}`;

                    console.log("Removendo foto do Storage:", filePath);
                    await supabase.storage
                        .from("vehicle-photos")
                        .remove([filePath]);
                } catch (storageErr) {
                    console.error("Erro ao remover foto do Storage:", storageErr);
                    // Continuar mesmo se falhar ao remover foto
                }
            }

            // Deletar veículo do banco
            const { error } = await supabase
                .from("client_vehicles")
                .delete()
                .eq("id", vehicleId);
            
            if (error) {
                throw error;
            }

            // Verificar se foi realmente deletado
            const { data: checkData } = await supabase
                .from("client_vehicles")
                .select("id")
                .eq("id", vehicleId)
                .single();
            
            if (checkData) {
                throw new Error("Veículo não foi deletado - operação bloqueada por RLS");
            }

            // Recarregar veículos
            await fetchClientVehicles(clientData.id);
            toast({ title: "Veículo removido com sucesso" });
        } catch (err: any) {
            console.error("Erro ao remover veículo:", err);
            toast({
                title: "Erro ao remover veículo",
                description: err.message || "Falha ao remover o veículo. Verifique suas permissões.",
                variant: "destructive",
            });
        }
    };

    const handleAddAppointment = async () => {
        if (!appointmentForm.service_type || !appointmentForm.scheduled_date || !appointmentForm.scheduled_time || !appointmentForm.vehicle_id || !clientData) {
            toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
            return;
        }

        if (!appointmentForm.videoFile) {
            toast({ title: "Vídeo do problema é obrigatório", variant: "destructive" });
            return;
        }

        // Check if client has reached appointment limit (only count active appointments)
        const appointmentsThisYear = appointments.filter((apt) => {
            const aptYear = new Date(apt.scheduled_date).getFullYear();
            return aptYear === new Date().getFullYear() && apt.status !== "cancelado";
        });

        if (appointmentsThisYear.length >= (clientData.max_replacements || 3)) {
            toast({ title: "Você já atingiu o limite de agendamentos para este ano", variant: "destructive" });
            return;
        }

        setSubmittingAppointment(true);
        try {
            let videoUrl = "";

            // Upload vídeo se existir
            if (appointmentForm.videoFile) {
                setUploadingAppointmentVideo(true);
                const fileExt = appointmentForm.videoFile.name.split('.').pop();
                const fileName = `${clientData.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("appointment-videos")
                    .upload(fileName, appointmentForm.videoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from("appointment-videos")
                    .getPublicUrl(fileName);

                videoUrl = publicUrl;
                setUploadingAppointmentVideo(false);
            }

            // Corrigir timezone: adicionar 1 dia à data
            const dateObj = new Date(appointmentForm.scheduled_date);
            dateObj.setDate(dateObj.getDate() + 1);
            const correctedDate = dateObj.toISOString().split('T')[0];
            
            console.log("📅 Cliente criando agendamento - Original:", appointmentForm.scheduled_date);
            console.log("📤 Cliente criando agendamento - Corrigida:", correctedDate);
            
            const { error } = await supabase
                .from("appointments")
                .insert({
                    client_id: clientData.id,
                    client_name: clientData.name,
                    service_type: appointmentForm.service_type,
                    scheduled_date: correctedDate,
                    scheduled_time: appointmentForm.scheduled_time,
                    status: "pendente",
                    notes: appointmentForm.notes,
                    vehicle_id: appointmentForm.vehicle_id,
                    appointment_video_url: videoUrl,
                });

            if (error) throw error;

            setAppointmentForm({ service_type: "", scheduled_date: "", scheduled_time: "", notes: "", vehicle_id: "", videoFile: null });
            setAppointmentVideoPreview("");
            setAppointmentDialogOpen(false);
            fetchAppointments(clientData.id);
            toast({ title: "Agendamento realizado com sucesso!" });
        } catch (err: any) {
            toast({
                title: "Erro ao agendar",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setSubmittingAppointment(false);
            setUploadingAppointmentVideo(false);
        }
    };

    const handleSave = async () => {
        if (!clientData?.id) return;
        setSaving(true);
        try {
            const sanitizedData = {
                name: formData.name.trim(),
                email: normalizeEmail(formData.email),
                phone: formData.phone.trim(),
                cpf: normalizeCpf(formData.cpf) || null,
                vehicle: formData.vehicle.trim(),
                plate: normalizePlate(formData.plate) || null,
            };

            const currentData = {
                name: clientData.name || "",
                email: normalizeEmail(clientData.email),
                phone: clientData.phone || "",
                cpf: normalizeCpf(clientData.cpf) || null,
                vehicle: clientData.vehicle || "",
                plate: normalizePlate(clientData.plate) || null,
            };

            const changedData = Object.fromEntries(
                Object.entries(sanitizedData).filter(([key, value]) => currentData[key as keyof typeof currentData] !== value)
            );

            if (Object.keys(changedData).length === 0) {
                setEditingSection(null);
                toast({ title: "Nenhuma alteração para salvar." });
                return;
            }

            if (changedData.email) {
                const { data: emailConflict } = await supabase
                    .from("clients")
                    .select("id")
                    .eq("email", changedData.email)
                    .neq("id", clientData.id)
                    .maybeSingle();

                if (emailConflict) {
                    throw new Error("Este email já está sendo usado por outro cliente.");
                }
            }

            if (changedData.cpf) {
                const { data: cpfConflict } = await supabase
                    .from("clients")
                    .select("id")
                    .eq("cpf", changedData.cpf)
                    .neq("id", clientData.id)
                    .maybeSingle();

                if (cpfConflict) {
                    throw new Error("Este CPF já está cadastrado para outro cliente.");
                }
            }

            if (changedData.plate) {
                const { data: plateConflict } = await supabase
                    .from("clients")
                    .select("id")
                    .eq("plate", changedData.plate)
                    .neq("id", clientData.id)
                    .maybeSingle();

                if (plateConflict) {
                    throw new Error("Esta placa já está cadastrada para outro cliente.");
                }
            }

            const { error } = await supabase
                .from("clients")
                .update(changedData)
                .eq("id", clientData.id);

            if (error) throw error;

            setClientData({ ...clientData, ...changedData });
            setFormData((prev) => ({ ...prev, ...changedData }));
            setEditingSection(null);
            toast({ title: "Dados atualizados com sucesso!" });
        } catch (err: any) {
            toast({
                title: "Erro ao salvar",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelAppointment = async (appointmentId: string) => {
        try {
            // Update appointment status to cancelled
            const { error: updateError } = await supabase
                .from("appointments")
                .update({ status: "cancelado" })
                .eq("id", appointmentId);

            if (updateError) throw updateError;

            // Refresh appointments list
            if (clientData?.id) {
                fetchAppointments(clientData.id);
            }

            toast({ title: "Agendamento cancelado", description: "Crédito devolvido com sucesso!" });
        } catch (err: any) {
            toast({
                title: "Erro ao cancelar",
                description: err.message,
                variant: "destructive",
            });
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
        });
        setEditAppointmentDialogOpen(true);
    };

    const handleEditAppointment = async () => {
        if (!appointmentToEdit || !editAppointmentForm.scheduled_date || !editAppointmentForm.scheduled_time) {
            toast({ title: "Preencha data e hora", variant: "destructive" });
            return;
        }

        // Garantir que as datas estão no formato correto (YYYY-MM-DD)
        const currentDateStr = typeof appointmentToEdit.scheduled_date === 'string' 
            ? appointmentToEdit.scheduled_date.split('T')[0]
            : appointmentToEdit.scheduled_date;
        
        const newDateStr = editAppointmentForm.scheduled_date;

        // Validar se o novo horário é posterior ao horário original/atual
        // Comparação simples de strings no formato YYYY-MM-DD HH:mm funciona corretamente
        const currentTimeStr = `${currentDateStr} ${appointmentToEdit.scheduled_time}`;
        const newTimeStr = `${newDateStr} ${editAppointmentForm.scheduled_time}`;

        if (newTimeStr < currentTimeStr) {
            toast({
                title: "Horário inválido",
                description: "Você só pode alterar para um horário posterior. Não é permitido alterar para trás.",
                variant: "destructive",
            });
            return;
        }

        setSubmittingEditAppointment(true);
        try {
            // Corrigir timezone: adicionar 1 dia à data
            const dateObj = new Date(newDateStr);
            dateObj.setDate(dateObj.getDate() + 1);
            const correctedDate = dateObj.toISOString().split('T')[0];
            
            console.log("📅 Cliente - ANTES DE ENVIAR:", newDateStr);
            console.log("📤 Cliente - Data corrigida:", correctedDate);
            
            const { error } = await supabase
                .from("appointments")
                .update({
                    scheduled_date: correctedDate,
                    scheduled_time: editAppointmentForm.scheduled_time,
                })
                .eq("id", appointmentToEdit.id);

            if (error) throw error;

            setEditAppointmentDialogOpen(false);
            if (clientData?.id) {
                fetchAppointments(clientData.id);
            }
            toast({ title: "Horário confirmado com sucesso!" });
        } catch (err: any) {
            toast({
                title: "Erro ao alterar agendamento",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setSubmittingEditAppointment(false);
        }
    };

    const handleConfirmChangedAppointment = async (appointmentId: string) => {
        setConfirmingChangedAppointmentId(appointmentId);
        try {
            const { error } = await supabase
                .from("appointments")
                .update({ status: "confirmado" })
                .eq("id", appointmentId);

            if (error) throw error;

            if (clientData?.id) {
                fetchAppointments(clientData.id);
            }
            toast({ title: "Horário confirmado! A loja foi notificada." });
        } catch (err: any) {
            toast({
                title: "Erro ao confirmar",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setConfirmingChangedAppointmentId(null);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate("/");
    };

    // Redirect if not logged in
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center glow-primary animate-pulse">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/plan-auth" replace />;
    }

    if (dataLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center glow-primary animate-pulse">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border/40 bg-background/80">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center glow-primary">
                            <Shield className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-display font-bold text-foreground">Iguaçu Auto Vidros</h1>
                            <p className="text-xs text-muted-foreground">Minha Conta</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Welcome Section */}
                    <div className="glass-card p-8 border border-primary/30 rounded-2xl">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl font-display font-bold text-foreground">
                                Bem-vindo, {clientData?.name}! 👋
                            </h2>
                        </div>
                        <p className="text-lg text-muted-foreground mb-6">
                            Aqui você pode gerenciar seus dados e acompanhar seus serviços.
                        </p>
                    </div>

                    {/* Appointments Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-8 rounded-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Agendar Serviço
                            </h3>
                            <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Novo Agendamento
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card border-border">
                                    <DialogHeader>
                                        <DialogTitle className="font-display">Agendar Novo Serviço</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Serviço *</Label>
                                            <Select value={appointmentForm.service_type} onValueChange={(v) => setAppointmentForm({ ...appointmentForm, service_type: v })}>
                                                <SelectTrigger><SelectValue placeholder="Selecione um serviço..." /></SelectTrigger>
                                                <SelectContent>
                                                    {replacementItems.map((item) => (
                                                        <SelectItem key={item} value={item}>{item}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Data *</Label>
                                            <Input
                                                type="date"
                                                value={appointmentForm.scheduled_date}
                                                onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Hora *</Label>
                                            <Input
                                                type="time"
                                                value={appointmentForm.scheduled_time}
                                                onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_time: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Veículo *</Label>
                                            {clientVehicles.length === 0 ? (
                                                <p className="text-sm text-red-600 mb-2">Adicione um veículo para continuar</p>
                                            ) : (
                                                <Select value={appointmentForm.vehicle_id} onValueChange={(v) => setAppointmentForm({ ...appointmentForm, vehicle_id: v })}>
                                                    <SelectTrigger><SelectValue placeholder="Selecione um veículo..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {clientVehicles.map((vehicle) => (
                                                            <SelectItem key={vehicle.id} value={vehicle.id}>
                                                                {vehicle.vehicle} - {vehicle.plate}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                        <div>
                                            <Label>Observações</Label>
                                            <Input
                                                value={appointmentForm.notes}
                                                onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                                                placeholder="Algo especial que devemos saber?"
                                            />
                                        </div>
                                        <div>
                                            <Label>Vídeo do Problema *</Label>
                                            <div className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            if (file.size > 100 * 1024 * 1024) {
                                                                toast({ title: "Vídeo muito grande (máx 100MB)", variant: "destructive" });
                                                                return;
                                                            }
                                                            setAppointmentForm({ ...appointmentForm, videoFile: file });
                                                            const url = URL.createObjectURL(file);
                                                            setAppointmentVideoPreview(url);
                                                        }
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                {appointmentVideoPreview ? (
                                                    <div>
                                                        <p className="text-sm font-medium text-green-600 mb-2">✓ Vídeo selecionado</p>
                                                        <p className="text-xs text-muted-foreground">{appointmentForm.videoFile?.name}</p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setAppointmentForm({ ...appointmentForm, videoFile: null });
                                                                setAppointmentVideoPreview("");
                                                            }}
                                                            className="mt-2"
                                                        >
                                                            Remover Vídeo
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                                        <p className="text-sm font-medium">Clique ou arraste um vídeo</p>
                                                        <p className="text-xs text-muted-foreground">Máximo 100MB</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleAddAppointment}
                                            disabled={submittingAppointment || uploadingAppointmentVideo}
                                            className="w-full"
                                        >
                                            {submittingAppointment || uploadingAppointmentVideo ? "Agendando..." : "Confirmar Agendamento"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Appointments List */}
                        <div className="space-y-3">
                            {appointments.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento realizado ainda</p>
                            ) : (
                                appointments.map((apt) => {
                                    const bgColor = apt.status === "pendente" ? "bg-amber-50 dark:bg-amber-950/20" : apt.status === "confirmado" ? "bg-blue-50 dark:bg-blue-950/20" : apt.status === "cancelado" ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20";
                                    const borderColor = apt.status === "pendente" ? "border-amber-200" : apt.status === "confirmado" ? "border-blue-200" : apt.status === "cancelado" ? "border-red-200" : "border-green-200";
                                    const canCancel = apt.status !== "concluido" && apt.status !== "cancelado";
                                    return (
                                        <div key={apt.id} className={`p-4 ${bgColor} rounded-lg border ${borderColor} border-l-4`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-medium text-foreground">{apt.service_type}</p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        📅 {new Date(apt.scheduled_date).toLocaleDateString("pt-BR")} às {apt.scheduled_time}
                                                    </p>
                                                    {apt.time_changed_at && (
                                                         <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded">
                                                             <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                                                                 🔔 Horário Alterado
                                                             </p>
                                                             <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                                                 Anterior: {apt.original_scheduled_date} às {apt.original_scheduled_time}
                                                             </p>
                                                             {apt.time_change_reason && (
                                                                 <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                                                     Motivo: {apt.time_change_reason}
                                                                 </p>
                                                             )}
                                                             {apt.status === "pendente" && (
                                                                 <div className="flex gap-2 mt-2">
                                                                     <Button
                                                                         size="sm"
                                                                         className="text-xs h-7 flex-1 bg-green-600 hover:bg-green-700"
                                                                         onClick={() => handleConfirmChangedAppointment(apt.id)}
                                                                         disabled={confirmingChangedAppointmentId === apt.id}
                                                                     >
                                                                         ✅ Aceitar Horário
                                                                     </Button>
                                                                 </div>
                                                             )}
                                                         </div>
                                                     )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <span className={`px-3 py-1 rounded-full text-xs font-semibold ${apt.status === "pendente" ? "bg-amber-100 text-amber-700" : apt.status === "confirmado" ? "bg-blue-100 text-blue-700" : apt.status === "cancelado" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                                         {apt.status === "pendente" ? "⏳ Aguardando confirmação da loja" : apt.status === "confirmado" ? "⏱️ Confirmado" : apt.status === "cancelado" ? "✕ Cancelado" : "✓ Concluído"}
                                                     </span>
                                                     {apt.status !== "cancelado" && apt.status !== "concluído" && (
                                                         <Button
                                                             variant="outline"
                                                             size="sm"
                                                             onClick={() => openEditAppointmentDialog(apt)}
                                                             className="text-xs h-7"
                                                         >
                                                             ✏️ Alterar
                                                         </Button>
                                                     )}
                                                     {canCancel && (
                                                         <Button
                                                             variant="ghost"
                                                             size="sm"
                                                             onClick={() => handleCancelAppointment(apt.id)}
                                                             className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                         >
                                                             <Trash2 className="w-4 h-4" />
                                                         </Button>
                                                     )}
                                                 </div>
                                            </div>
                                            {apt.notes && <p className="text-sm text-muted-foreground">💬 {apt.notes}</p>}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>

                    {/* Vehicles Management Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="glass-card p-8 rounded-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                                <Car className="w-5 h-5 text-primary" />
                                Meus Veículos
                            </h3>
                            <Dialog open={addVehicleDialogOpen} onOpenChange={setAddVehicleDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Adicionar Veículo
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card border-border">
                                    <DialogHeader>
                                        <DialogTitle className="font-display">Adicionar Novo Veículo</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        {!validationResult ? (
                                            <>
                                                <div>
                                                    <Label>Veículo (marca e modelo) *</Label>
                                                    <Input
                                                        value={newVehicleForm.vehicle}
                                                        onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vehicle: e.target.value })}
                                                        placeholder="Ex: Honda Civic 2022"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Placa *</Label>
                                                    <Input
                                                        value={newVehicleForm.plate}
                                                        onChange={(e) => setNewVehicleForm({ ...newVehicleForm, plate: e.target.value })}
                                                        placeholder="ABC-1234"
                                                    />
                                                </div>

                                                <div>
                                                    <Label>Foto do Veículo * (Obrigatória)</Label>
                                                    {vehiclePhotoPreview ? (
                                                        <div className="space-y-3">
                                                            <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                                                                <img
                                                                    src={vehiclePhotoPreview}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full"
                                                                onClick={() => {
                                                                    setNewVehicleForm({ ...newVehicleForm, photoFile: null });
                                                                    setVehiclePhotoPreview("");
                                                                }}
                                                            >
                                                                ✕ Remover Foto
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={handleVehiclePhotoChange}
                                                                disabled={uploadingVehiclePhoto}
                                                            />
                                                            <div className="text-center">
                                                                <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                                                <p className="text-sm font-medium text-foreground">Clique para selecionar foto</p>
                                                                <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou JPEG (máx 5MB)</p>
                                                            </div>
                                                        </label>
                                                    )}
                                                </div>

                                                <Button
                                                    onClick={handleValidateAndAddVehicle}
                                                    disabled={validatingNewVehicle || !newVehicleForm.photoFile}
                                                    className="w-full"
                                                >
                                                    {validatingNewVehicle ? "Verificando..." : "Verificar com IA"}
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className={`p-4 rounded-lg border-2 ${validationResult.isNational ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {validationResult.isNational ? (
                                                            <Check className="w-5 h-5 text-success" />
                                                        ) : (
                                                            <AlertCircle className="w-5 h-5 text-destructive" />
                                                        )}
                                                        <p className="font-semibold">
                                                            {validationResult.isNational ? "Veículo Nacional ✓" : "Veículo Importado"}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm">{validationResult.message}</p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Marca: {validationResult.brand} | Modelo: {validationResult.model} | Confiança: {Math.round(validationResult.confidence * 100)}%
                                                    </p>
                                                </div>
                                                {validationResult.isNational && (
                                                    <Button
                                                        onClick={handleConfirmAddVehicle}
                                                        className="w-full gap-2"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Confirmar e Adicionar
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setValidationResult(null);
                                                        setNewVehicleForm({ vehicle: "", plate: "", photoFile: null });
                                                        setVehiclePhotoPreview("");
                                                    }}
                                                    className="w-full"
                                                >
                                                    Voltar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Vehicles List */}
                         <div className="space-y-3">
                             {clientVehicles.length === 0 ? (
                                 <p className="text-sm text-muted-foreground text-center py-8">Nenhum veículo adicionado ainda</p>
                             ) : (
                                 clientVehicles.map((vehicle) => (
                                     <div
                                         key={vehicle.id}
                                         className="p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between gap-4"
                                     >
                                         <div className="flex items-center gap-3 flex-1 min-w-0">
                                             {vehicle.vehicle_photo_url ? (
                                                 <button
                                                     onClick={() => {
                                                         setSelectedPhotoUrl(vehicle.vehicle_photo_url || "");
                                                         setPhotoModalOpen(true);
                                                     }}
                                                     className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                                                 >
                                                     <img
                                                         src={vehicle.vehicle_photo_url}
                                                         alt={vehicle.vehicle}
                                                         className="w-12 h-12 object-cover rounded-lg"
                                                     />
                                                 </button>
                                             ) : (
                                                 <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                     <Car className="w-5 h-5 text-primary" />
                                                 </div>
                                             )}
                                             <div className="min-w-0">
                                                 <p className="font-medium text-foreground truncate">{vehicle.vehicle}</p>
                                                 <p className="text-sm text-muted-foreground">
                                                     Placa: {vehicle.plate} {vehicle.is_primary && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Principal</span>}
                                                 </p>
                                             </div>
                                         </div>
                                         <Button
                                             variant="ghost"
                                             size="sm"
                                             onClick={() => handleDeleteVehicle(vehicle.id)}
                                             className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 flex-shrink-0"
                                         >
                                             <Trash2 className="w-4 h-4" />
                                         </Button>
                                     </div>
                                 ))
                             )}
                         </div>
                    </motion.div>

                    {/* Bulk Upload Section */}
                    {bulkUploadEnabled && clientData && (
                        <BulkVehicleUpload 
                            clientId={clientData.id!}
                            isEnabled={bulkUploadEnabled}
                            onSuccess={() => fetchClientVehicles(clientData.id!)}
                        />
                    )}

                    {/* Personal Data Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-8 rounded-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Dados Pessoais
                            </h3>
                            {editingSection !== "personal" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingSection("personal")}
                                    className="gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Editar
                                </Button>
                            )}
                        </div>

                        {editingSection === "personal" ? (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Nome</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Seu nome"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="seu@email.com"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(45) 99999-9999"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input
                                        id="cpf"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                        placeholder="000.000.000-00"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? "Salvando..." : "Salvar"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditingSection(null)}
                                        className="flex-1 gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Nome</p>
                                    <p className="text-foreground font-medium">{clientData?.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                                    <p className="text-foreground font-medium">{clientData?.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                                    <p className="text-foreground font-medium">{clientData?.phone}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">CPF</p>
                                    <p className="text-foreground font-medium">{clientData?.cpf}</p>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Vehicle Data Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-8 rounded-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                                <Car className="w-5 h-5 text-primary" />
                                Dados do Veículo
                            </h3>
                            {editingSection !== "vehicle" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingSection("vehicle")}
                                    className="gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Editar
                                </Button>
                            )}
                        </div>

                        {editingSection === "vehicle" ? (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="vehicle">Veículo</Label>
                                    <Input
                                        id="vehicle"
                                        value={formData.vehicle}
                                        onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                                        placeholder="Honda Civic 2022"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="plate">Placa</Label>
                                    <Input
                                        id="plate"
                                        value={formData.plate}
                                        onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                                        placeholder="ABC-1D23"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? "Salvando..." : "Salvar"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditingSection(null)}
                                        className="flex-1 gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Veículo</p>
                                    <p className="text-foreground font-medium">{clientData?.vehicle}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Placa</p>
                                    <p className="text-foreground font-medium">{clientData?.plate}</p>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Dialog para Alterar Horário de Agendamento */}
                    <Dialog open={editAppointmentDialogOpen} onOpenChange={setEditAppointmentDialogOpen}>
                        <DialogContent className="bg-card border-border">
                            <DialogHeader>
                                <DialogTitle className="font-display">Alterar Horário do Agendamento</DialogTitle>
                            </DialogHeader>
                            {appointmentToEdit && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Serviço</p>
                                        <p className="font-semibold text-foreground">{appointmentToEdit.service_type}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Horário atual: {new Date(appointmentToEdit.scheduled_date).toLocaleDateString("pt-BR")} às {appointmentToEdit.scheduled_time}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Nova Data *</Label>
                                        <Input
                                            type="date"
                                            value={editAppointmentForm.scheduled_date}
                                            onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, scheduled_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Novo Horário *</Label>
                                        <Input
                                            type="time"
                                            value={editAppointmentForm.scheduled_time}
                                            onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, scheduled_time: e.target.value })}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleEditAppointment}
                                        disabled={submittingEditAppointment}
                                        className="w-full gradient-primary text-primary-foreground font-semibold"
                                    >
                                        {submittingEditAppointment ? "Alterando..." : "Confirmar Horário"}
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Modal para Visualizar Foto do Veículo */}
                    <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
                        <DialogContent className="bg-card border-border max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-display">Foto do Veículo</DialogTitle>
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

                    {/* Modal para Visualizar Vídeo do Agendamento */}
                    <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
                        <DialogContent className="bg-card border-border max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-display">Vídeo do Problema</DialogTitle>
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
                                        <h4 className="font-semibold text-foreground mb-2">Por que o vídeo é obrigatório?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            O vídeo documenta o problema do seu veículo antes do atendimento, permitindo que nossa equipe entenda melhor a situação e se prepare adequadamente com os materiais e ferramentas corretos.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-2">Como funciona?</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                            <li>Grave um vídeo mostrando o dano ou problema</li>
                                            <li>Anexe o vídeo ao criar o agendamento</li>
                                            <li>Nossa equipe analisa antes do atendimento</li>
                                            <li>Você pode visualizar a qualquer momento aqui</li>
                                        </ul>
                                    </div>
                                    <div className="pt-2 border-t border-border">
                                        <p className="text-xs text-muted-foreground italic">
                                            💡 Dica: Filme em boa iluminação, mostre o problema por diferentes ângulos e inclua som (explicando o problema se possível).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </motion.div>
            </main>
        </div>
    );
};

export default ClientDashboard;
