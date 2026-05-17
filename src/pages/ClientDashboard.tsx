import { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, Edit, Save, X, Mail, Phone, User, Car, LogOut, Calendar, Plus, Trash2, Check, AlertCircle, Upload, Image, DollarSign, Eye, Clock, Camera, CreditCard, CalendarCheck } from "lucide-react";
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
import PlanStatusCard from "@/components/PlanStatusCard";
import PlanPaymentModal from "@/components/PlanPaymentModal";
import PlanPromotionCard from "@/components/PlanPromotionCard";

interface ClientProfile {
     id?: string;
     user_id?: string;
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
     profile_status?: string;
}

interface ClientVehicle {
     id: string;
     vehicle: string;
     plate: string;
     is_national: boolean;
     is_primary: boolean;
     vehicle_photo_url?: string;
     photo_front_url?: string;
     photo_back_url?: string;
     photo_left_url?: string;
     photo_right_url?: string;
     photo_headlights_front_url?: string;
     photo_headlights_rear_url?: string;
     photo_mirrors_url?: string;
     photo_interior_rear_url?: string;
     photo_interior_front_url?: string;
     photo_dashboard_url?: string;
     photo_trunk_open_url?: string;
     status?: string;
     plan_active?: boolean;
     plan_start?: string;
     plan_end?: string;
     plan_paid_at?: string;
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
    const [newVehicleForm, setNewVehicleForm] = useState({ 
        vehicle: "", 
        plate: "", 
        photoFront: null as File | null,
        photoBack: null as File | null,
        photoLeft: null as File | null,
        photoRight: null as File | null,
        photoHeadlightsFront: null as File | null,
        photoHeadlightsRear: null as File | null,
        photoMirrors: null as File | null,
        photoInteriorRear: null as File | null,
        photoInteriorFront: null as File | null,
        photoDashboard: null as File | null,
        photoTrunkOpen: null as File | null
    });
    const [photoPreviews, setPhotoPreviews] = useState({
        front: "",
        back: "",
        left: "",
        right: "",
        headlightsFront: "",
        headlightsRear: "",
        mirrors: "",
        interiorRear: "",
        interiorFront: "",
        dashboard: "",
        trunkOpen: ""
    });
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
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [selectedVehicleForPayment, setSelectedVehicleForPayment] = useState<string | null>(null);

    // ... inside ClientDashboard ...
    const now = new Date();
    const planEndDate = clientData?.plan_end ? new Date(clientData.plan_end) : null;
    const isPlanExpired = planEndDate && now > planEndDate;
    const calculatedPlanStatus: "free" | "active" | "expired" = clientData?.plan_active 
        ? (isPlanExpired ? "expired" : "active") 
        : "free";

    const isPendingApproval = clientData?.profile_status === "pending" || 
                             clientVehicles.some(v => v.is_primary && v.status === "pending");

    const handlePaymentClick = (vehicleId: string) => {
        setSelectedVehicleForPayment(vehicleId);
        setPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!clientData?.id || !selectedVehicleForPayment) return;
        setIsProcessingPayment(true);
        try {
            // Simular sucesso do pagamento
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const today = new Date();
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            
            const { error } = await supabase
                .from("client_vehicles")
                .update({ 
                    plan_active: true,
                    plan_paid_at: today.toISOString(),
                    plan_start: today.toISOString().split("T")[0],
                    plan_end: nextMonth.toISOString().split("T")[0]
                })
                .eq("id", selectedVehicleForPayment);

            if (error) throw error;

            toast({ 
                title: "Pagamento processado!", 
                description: "O plano para este veículo foi ativado com sucesso por 1 mês." 
            });
            setPaymentModalOpen(false);
            
            // Recarregar veículos
            fetchClientVehicles(clientData.id);
        } catch (error: any) {
            toast({ title: "Erro no pagamento", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessingPayment(false);
            setSelectedVehicleForPayment(null);
        }
    };

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
                    // Fetch profile status
                    const { data: profileData } = await supabase
                        .from("profiles")
                        .select("status, full_name, phone, cpf") // Incluindo full_name, phone e cpf
                        .eq("id", clientRecord.user_id)
                        .maybeSingle();

                    setClientData({
                        ...clientRecord,
                        name: profileData?.full_name || clientRecord.name || "", // Prioriza profile, depois clientRecord
                        email: clientRecord.email || session.user?.email || "", // Email do cliente ou da sessão
                        phone: profileData?.phone || clientRecord.phone || "", // Prioriza profile, depois clientRecord
                        cpf: profileData?.cpf || clientRecord.cpf || "", // Prioriza profile, depois clientRecord
                        profile_status: profileData?.status || "pending"
                    });
                    setFormData({
                        ...clientRecord,
                        name: profileData?.full_name || clientRecord.name || "", // Prioriza profile, depois clientRecord
                        email: clientRecord.email || session.user?.email || "", // Email do cliente ou da sessão
                        phone: profileData?.phone || clientRecord.phone || "", // Prioriza profile, depois clientRecord
                        cpf: profileData?.cpf || clientRecord.cpf || "", // Prioriza profile, depois clientRecord
                        plate: clientRecord.plate || "",
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

    const uploadVehiclePhoto = async (file: File, clientId: string, side: string) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${clientId}/${Date.now()}_${side}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("vehicle-photos")
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("vehicle-photos")
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error(`Erro ao fazer upload da foto ${side}:`, error);
            return null;
        }
    };

    const handlePhotoChange = (side: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({ title: "Selecione uma imagem válida", variant: "destructive" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
            return;
        }

        const fieldMap: Record<string, string> = {
            front: "photoFront",
            back: "photoBack",
            left: "photoLeft",
            right: "photoRight",
            headlightsFront: "photoHeadlightsFront",
            headlightsRear: "photoHeadlightsRear",
            mirrors: "photoMirrors",
            interiorRear: "photoInteriorRear",
            interiorFront: "photoInteriorFront",
            dashboard: "photoDashboard",
            trunkOpen: "photoTrunkOpen"
        };

        setNewVehicleForm({ ...newVehicleForm, [fieldMap[side]]: file });
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreviews(prev => ({ ...prev, [side]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleValidateAndAddVehicle = async () => {
        if (!newVehicleForm.vehicle || !newVehicleForm.plate) {
            toast({ title: "Preencha veículo e placa", variant: "destructive" });
            return;
        }

        const skipInspection = (clientData as any)?.skip_inspection;

        if (!skipInspection && (
            !newVehicleForm.photoFront || !newVehicleForm.photoBack || !newVehicleForm.photoLeft || !newVehicleForm.photoRight ||
            !newVehicleForm.photoHeadlightsFront || !newVehicleForm.photoHeadlightsRear || !newVehicleForm.photoMirrors ||
            !newVehicleForm.photoInteriorRear || !newVehicleForm.photoInteriorFront || !newVehicleForm.photoDashboard ||
            !newVehicleForm.photoTrunkOpen
        )) {
            toast({ title: "Todas as 11 fotos do veículo são obrigatórias para vistoria", variant: "destructive" });
            return;
        }

        if (!clientData) return;

        // Se o cliente tem skip_inspection, pula a validação de IA e vai direto pro salvamento
        if (skipInspection) {
            setValidationResult({ isNational: true, message: "Vistoria desativada para este cliente.", brand: "N/A", model: "N/A", confidence: 1 });
            return;
        }

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
            toast({ title: "Erro ao validar", description: err.message, variant: "destructive" });
        } finally {
            setValidatingNewVehicle(false);
        }
    };

    const handleConfirmAddVehicle = async () => {
        if (!clientData || !validationResult) return;

        const skipInspection = (clientData as any)?.skip_inspection === true;

        try {
            setUploadingVehiclePhoto(true);
            
            let photoUrls = { 
                front: "", back: "", left: "", right: "",
                headlightsFront: "", headlightsRear: "", mirrors: "",
                interiorRear: "", interiorFront: "", dashboard: "", trunkOpen: ""
            };

            if (!skipInspection) {
                // Upload das 11 fotos
                const uploadPromises = [
                    uploadVehiclePhoto(newVehicleForm.photoFront!, clientData.id!, `${newVehicleForm.plate}_front`),
                    uploadVehiclePhoto(newVehicleForm.photoBack!, clientData.id!, `${newVehicleForm.plate}_back`),
                    uploadVehiclePhoto(newVehicleForm.photoLeft!, clientData.id!, `${newVehicleForm.plate}_left`),
                    uploadVehiclePhoto(newVehicleForm.photoRight!, clientData.id!, `${newVehicleForm.plate}_right`),
                    uploadVehiclePhoto(newVehicleForm.photoHeadlightsFront!, clientData.id!, `${newVehicleForm.plate}_headlights_front`),
                    uploadVehiclePhoto(newVehicleForm.photoHeadlightsRear!, clientData.id!, `${newVehicleForm.plate}_headlights_rear`),
                    uploadVehiclePhoto(newVehicleForm.photoMirrors!, clientData.id!, `${newVehicleForm.plate}_mirrors`),
                    uploadVehiclePhoto(newVehicleForm.photoInteriorRear!, clientData.id!, `${newVehicleForm.plate}_interior_rear`),
                    uploadVehiclePhoto(newVehicleForm.photoInteriorFront!, clientData.id!, `${newVehicleForm.plate}_interior_front`),
                    uploadVehiclePhoto(newVehicleForm.photoDashboard!, clientData.id!, `${newVehicleForm.plate}_dashboard`),
                    uploadVehiclePhoto(newVehicleForm.photoTrunkOpen!, clientData.id!, `${newVehicleForm.plate}_trunk_open`)
                ];

                const results = await Promise.all(uploadPromises);
                if (results.some(r => !r)) {
                    toast({ title: "Erro ao fazer upload de uma ou mais fotos", variant: "destructive" });
                    return;
                }
                photoUrls = { 
                    front: results[0]!, back: results[1]!, left: results[2]!, right: results[3]!,
                    headlightsFront: results[4]!, headlightsRear: results[5]!, mirrors: results[6]!,
                    interiorRear: results[7]!, interiorFront: results[8]!, dashboard: results[9]!, trunkOpen: results[10]!
                };
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
                    vehicle_photo_url: photoUrls.front || null, // Usar frontal como principal
                    photo_front_url: photoUrls.front || null,
                    photo_back_url: photoUrls.back || null,
                    photo_left_url: photoUrls.left || null,
                    photo_right_url: photoUrls.right || null,
                    photo_headlights_front_url: photoUrls.headlightsFront || null,
                    photo_headlights_rear_url: photoUrls.headlightsRear || null,
                    photo_mirrors_url: photoUrls.mirrors || null,
                    photo_interior_rear_url: photoUrls.interiorRear || null,
                    photo_interior_front_url: photoUrls.interiorFront || null,
                    photo_dashboard_url: photoUrls.dashboard || null,
                    photo_trunk_open_url: photoUrls.trunkOpen || null,
                    status: skipInspection ? "approved" : "pending"
                });

            if (error) throw error;

            setNewVehicleForm({ 
                vehicle: "", plate: "", 
                photoFront: null, photoBack: null, photoLeft: null, photoRight: null,
                photoHeadlightsFront: null, photoHeadlightsRear: null, photoMirrors: null,
                photoInteriorRear: null, photoInteriorFront: null, photoDashboard: null, photoTrunkOpen: null
            });
            setPhotoPreviews({ 
                front: "", back: "", left: "", right: "",
                headlightsFront: "", headlightsRear: "", mirrors: "",
                interiorRear: "", interiorFront: "", dashboard: "", trunkOpen: ""
            });
            setValidationResult(null);
            setAddVehicleDialogOpen(false);
            fetchClientVehicles(clientData.id!);
            toast({ title: skipInspection ? "Veículo adicionado e liberado!" : "Veículo enviado para vistoria!" });
        } catch (err: any) {
            toast({ title: "Erro ao adicionar veículo", description: err.message, variant: "destructive" });
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

                    {/* Instructions Section - Highly Visual Journey */}
                    <div className="glass-card overflow-hidden rounded-3xl border border-primary/20 shadow-2xl">
                        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border-b border-primary/10">
                            <h3 className="text-3xl font-display font-black text-foreground flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg glow-primary">
                                    <Shield className="w-7 h-7 text-primary-foreground" />
                                </div>
                                Jornada do Cliente Clube do Vidro
                            </h3>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                            {/* Connecting Line (Desktop) */}
                            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2 z-0" />

                            {/* Step 1 */}
                            <div className="relative z-10 space-y-4 text-center md:text-left group">
                                <div className="w-20 h-20 mx-auto md:mx-0 bg-background border-4 border-primary rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-black text-sm">1</div>
                                    <Camera className="w-10 h-10 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-foreground">Vistoria</h4>
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        Envie <strong className="text-primary">11 fotos</strong> do seu carro para nossa equipe validar.
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative z-10 space-y-4 text-center md:text-left group">
                                <div className="w-20 h-20 mx-auto md:mx-0 bg-background border-4 border-primary rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-black text-sm">2</div>
                                    <CreditCard className="w-10 h-10 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-foreground">Ativação</h4>
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        Após aprovado, ative a mensalidade de <strong className="text-primary">R$ 19,90</strong> por veículo.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative z-10 space-y-4 text-center md:text-left group">
                                <div className="w-20 h-20 mx-auto md:mx-0 bg-background border-4 border-primary rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-black text-sm">3</div>
                                    <CalendarCheck className="w-10 h-10 text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-foreground">Serviço</h4>
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        Agende até <strong className="text-primary">3 trocas gratuitas</strong> por ano com tudo pago!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3-Step Workflow Grid */}
                    <div className="grid grid-cols-1 gap-8">
                        {/* STEP 1: VISTORIA */}
                        <div className={`p-8 rounded-2xl border-2 transition-all ${
                            clientVehicles.some(v => v.status === "approved") 
                                ? "border-green-500 bg-green-50/50 dark:bg-green-950/10" 
                                : isPendingApproval 
                                    ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/10"
                                    : "border-border bg-card"
                        }`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${
                                        clientVehicles.some(v => v.status === "approved")
                                            ? "bg-green-500 text-white"
                                            : "bg-primary text-white"
                                    }`}>
                                        {clientVehicles.some(v => v.status === "approved") ? <Check className="w-8 h-8" /> : "1"}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Passo 1: Vistoria do Veículo</h3>
                                        <p className="text-base text-muted-foreground">
                                            {clientVehicles.some(v => v.status === "approved") 
                                                ? "Você tem veículos aprovados!" 
                                                : isPendingApproval 
                                                    ? "Analisando suas fotos..." 
                                                    : "Envie as fotos do seu veículo."}
                                        </p>
                                    </div>
                                </div>
                                <Dialog open={addVehicleDialogOpen} onOpenChange={setAddVehicleDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="lg" className="gap-2 text-lg px-8">
                                            <Plus className="w-5 h-5" />
                                            Nova Vistoria
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card border-border max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle className="font-display">Enviar para Vistoria</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            {!validationResult ? (
                                                <>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>Veículo *</Label>
                                                            <Input
                                                                value={newVehicleForm.vehicle}
                                                                onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vehicle: e.target.value })}
                                                                placeholder="Ex: Honda Civic"
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
                                                    </div>

                                                    {!(clientData as any)?.skip_inspection ? (
                                                        <div className="space-y-4">
                                                            <Label className="text-primary font-bold">Fotos Necessárias (Obrigatório)</Label>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[40vh] p-1">
                                                                {[
                                                                    { side: "front", label: "Frente" },
                                                                    { side: "back", label: "Traseira" },
                                                                    { side: "left", label: "Lado Esquerdo" },
                                                                    { side: "right", label: "Lado Direito" },
                                                                    { side: "headlightsFront", label: "Faróis Frontais" },
                                                                    { side: "headlightsRear", label: "Faróis Traseiros" },
                                                                    { side: "mirrors", label: "Retrovisores" },
                                                                    { side: "interiorFront", label: "Interior Frontal" },
                                                                    { side: "interiorRear", label: "Interior Traseiro" },
                                                                    { side: "dashboard", label: "Painel" },
                                                                    { side: "trunkOpen", label: "Mala Aberta" }
                                                                ].map((photo) => (
                                                                    <div key={photo.side} className="space-y-1">
                                                                        <Label className="text-[10px] uppercase text-muted-foreground truncate block">{photo.label}</Label>
                                                                        <label className={`relative flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:bg-primary/5 ${(photoPreviews as any)[photo.side] ? 'border-success' : 'border-border'}`}>
                                                                            {(photoPreviews as any)[photo.side] ? (
                                                                                <img src={(photoPreviews as any)[photo.side]} className="w-full h-full object-cover rounded-lg" alt={photo.label} />
                                                                            ) : (
                                                                                <div className="text-center p-1">
                                                                                    <Image className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                                                                                    <span className="text-[8px] font-medium leading-tight block">Upload</span>
                                                                                </div>
                                                                            )}
                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(photo.side, e)} />
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-amber-50 rounded-lg"><p>Vistoria desativada.</p></div>
                                                    )}

                                                    <Button
                                                        onClick={handleValidateAndAddVehicle}
                                                        disabled={validatingNewVehicle}
                                                        className="w-full gradient-primary"
                                                    >
                                                        {validatingNewVehicle ? "Processando..." : "Enviar para Vistoria"}
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="p-4 border-2 border-success bg-success/10 rounded-lg text-center">
                                                        <Check className="w-10 h-10 text-success mx-auto mb-2" />
                                                        <p className="font-bold">Veículo Validado!</p>
                                                        <Button onClick={handleConfirmAddVehicle} className="mt-4 w-full">Confirmar Envio</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        {/* STEP 2: PAGAMENTO */}
                        <div className={`p-8 rounded-2xl border-2 transition-all ${
                            clientVehicles.some(v => v.plan_active && v.plan_end && new Date(v.plan_end) > new Date()) 
                                ? "border-green-500 bg-green-50/50 dark:bg-green-950/10" 
                                : "border-border bg-card"
                        } ${!clientVehicles.some(v => v.status === "approved") ? "opacity-50 grayscale pointer-events-none" : ""}`}>
                            <div className="flex items-start gap-6 mb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${
                                    clientVehicles.some(v => v.plan_active && v.plan_end && new Date(v.plan_end) > new Date())
                                        ? "bg-green-500 text-white"
                                        : "bg-primary text-white"
                                }`}>
                                    {clientVehicles.some(v => v.plan_active && v.plan_end && new Date(v.plan_end) > new Date()) ? <Check className="w-8 h-8" /> : "2"}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold">Passo 2: Pagamento por Veículo</h3>
                                    <p className="text-base text-muted-foreground">
                                        Cada veículo precisa de uma mensalidade de R$ 19,90 ativa.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {clientVehicles.filter(v => v.status === "approved").map(vehicle => {
                                    const vPlanEnd = vehicle.plan_end ? new Date(vehicle.plan_end) : null;
                                    const vExpired = vPlanEnd && new Date() > vPlanEnd;
                                    const vActive = vehicle.plan_active && !vExpired;

                                    return (
                                        <div key={vehicle.id} className={`p-4 rounded-xl border-2 flex items-center justify-between ${vActive ? "border-green-200 bg-green-50/30" : vExpired ? "border-red-200 bg-red-50/30" : "border-border bg-muted/20"}`}>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm truncate">{vehicle.vehicle}</p>
                                                <p className={`text-[10px] font-bold uppercase ${vActive ? "text-green-600" : vExpired ? "text-red-600" : "text-muted-foreground"}`}>
                                                    {vActive ? "✓ Pago" : vExpired ? "⚠ Expirado" : "○ Pendente"}
                                                </p>
                                            </div>
                                            {!vActive && (
                                                <Button size="sm" onClick={() => handlePaymentClick(vehicle.id)} className={vExpired ? "bg-red-600" : ""}>
                                                    <DollarSign className="w-3 h-3 mr-1" /> Pagar
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* STEP 3: AGENDAMENTO */}
                        <div className={`p-8 rounded-2xl border-2 transition-all border-blue-500 bg-blue-50/50 dark:bg-blue-950/10 ${
                            !clientVehicles.some(v => v.plan_active && v.plan_end && new Date(v.plan_end) > new Date()) ? "opacity-50 grayscale pointer-events-none" : ""
                        }`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Passo 3: Agendar Serviço</h3>
                                        <p className="text-base text-muted-foreground">
                                            Selecione um veículo com plano ativo para agendar.
                                        </p>
                                    </div>
                                </div>
                                <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2 text-lg px-8">
                                            <Calendar className="w-5 h-5" />
                                            Agendar Agora
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card border-border">
                                        <DialogHeader>
                                            <DialogTitle className="font-display">Novo Agendamento</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div>
                                                <Label>Veículo (Apenas pagos e ativos) *</Label>
                                                <Select value={appointmentForm.vehicle_id} onValueChange={(v) => setAppointmentForm({ ...appointmentForm, vehicle_id: v })}>
                                                    <SelectTrigger><SelectValue placeholder="Selecione um veículo pago..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {clientVehicles.filter(v => v.plan_active && v.plan_end && new Date(v.plan_end) > new Date()).map((vehicle) => (
                                                            <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicle} - {vehicle.plate}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Data *</Label>
                                                    <Input type="date" value={appointmentForm.scheduled_date} onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_date: e.target.value })} />
                                                </div>
                                                <div>
                                                    <Label>Hora *</Label>
                                                    <Input type="time" value={appointmentForm.scheduled_time} onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_time: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Vídeo do Problema *</Label>
                                                <Input type="file" accept="video/*" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setAppointmentForm({ ...appointmentForm, videoFile: file });
                                                        setAppointmentVideoPreview(URL.createObjectURL(file));
                                                    }
                                                }} />
                                            </div>
                                            <Button onClick={handleAddAppointment} disabled={submittingAppointment} className="w-full">
                                                Confirmar Agendamento
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>

                    {/* Active Appointments List (Histórico rápido) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-8 rounded-2xl"
                    >
                        <h3 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Meus Agendamentos
                        </h3>
                        <div className="space-y-3">
                            {appointments.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento realizado ainda</p>
                            ) : (
                                appointments.slice(0, 3).map((apt) => (
                                    <div key={apt.id} className="p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{apt.service_type}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(apt.scheduled_date).toLocaleDateString("pt-BR")} às {apt.scheduled_time}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            apt.status === "confirmado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                        }`}>
                                            {apt.status}
                                        </span>
                                    </div>
                                ))
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
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Veículo *</Label>
                                                        <Input
                                                            value={newVehicleForm.vehicle}
                                                            onChange={(e) => setNewVehicleForm({ ...newVehicleForm, vehicle: e.target.value })}
                                                            placeholder="Ex: Honda Civic"
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
                                                </div>

                                                {!(clientData as any)?.skip_inspection ? (
                                                    <div className="space-y-4">
                                                        <Label className="text-primary font-bold">Fotos Necessárias para Vistoria (Obrigatório)</Label>
                                                        <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded border border-primary/10">
                                                            Para sua segurança e aprovação do plano, precisamos de 11 fotos nítidas do veículo.
                                                        </p>
                                                        
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[40vh] p-1">
                                                            {[
                                                                { side: "front", label: "Frente" },
                                                                { side: "back", label: "Traseira" },
                                                                { side: "left", label: "Lado Esquerdo" },
                                                                { side: "right", label: "Lado Direito" },
                                                                { side: "headlightsFront", label: "Faróis Frontais" },
                                                                { side: "headlightsRear", label: "Faróis Traseiros" },
                                                                { side: "mirrors", label: "Retrovisores" },
                                                                { side: "interiorFront", label: "Interior Frontal" },
                                                                { side: "interiorRear", label: "Interior Traseiro" },
                                                                { side: "dashboard", label: "Painel" },
                                                                { side: "trunkOpen", label: "Mala Aberta" }
                                                            ].map((photo) => (
                                                                <div key={photo.side} className="space-y-1">
                                                                    <Label className="text-[10px] uppercase text-muted-foreground truncate block">{photo.label}</Label>
                                                                    <label className={`relative flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:bg-primary/5 ${(photoPreviews as any)[photo.side] ? 'border-success' : 'border-border'}`}>
                                                                        {(photoPreviews as any)[photo.side] ? (
                                                                            <img src={(photoPreviews as any)[photo.side]} className="w-full h-full object-cover rounded-lg" alt={photo.label} />
                                                                        ) : (
                                                                            <div className="text-center p-1">
                                                                                <Image className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                                                                                <span className="text-[8px] font-medium leading-tight block">Upload</span>
                                                                            </div>
                                                                        )}
                                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(photo.side, e)} />
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg">
                                                        <p className="text-sm text-amber-800 dark:text-amber-200">
                                                            🌟 Cliente Especial: Vistoria e fotos desativadas. O veículo será aprovado automaticamente.
                                                        </p>
                                                    </div>
                                                )}

                                                <Button
                                                    onClick={handleValidateAndAddVehicle}
                                                    disabled={validatingNewVehicle}
                                                    className="w-full gradient-primary"
                                                >
                                                    {(clientData as any)?.skip_inspection ? "Adicionar Veículo" : (validatingNewVehicle ? "Processando..." : "Enviar para Vistoria")}
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
                                                        setNewVehicleForm({ 
                                                            vehicle: "", plate: "", 
                                                            photoFront: null, photoBack: null, photoLeft: null, photoRight: null,
                                                            photoHeadlightsFront: null, photoHeadlightsRear: null, photoMirrors: null,
                                                            photoInteriorRear: null, photoInteriorFront: null, photoDashboard: null, photoTrunkOpen: null
                                                        });
                                                        setPhotoPreviews({ 
                                                            front: "", back: "", left: "", right: "",
                                                            headlightsFront: "", headlightsRear: "", mirrors: "",
                                                            interiorRear: "", interiorFront: "", dashboard: "", trunkOpen: ""
                                                        });
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
                    {clientData && (
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

                    {/* Modal de Pagamento do Plano */}
                    <PlanPaymentModal
                        isOpen={paymentModalOpen}
                        onClose={() => setPaymentModalOpen(false)}
                        onPaymentClick={handleConfirmPayment}
                        isLoading={isProcessingPayment}
                        clientName={clientData?.name}
                    />
                </motion.div>
            </main>
        </div>
    );
};

export default ClientDashboard;
