import { supabase } from '@/lib/supabaseClient';
import { Tables } from '@/lib/database.types';

type DeletionRequest = Tables<'document_deletion_requests'>;

interface RawDeletionRequest extends DeletionRequest {
    socio_titulares: {
        dni: string;
        nombres: string;
        apellidoPaterno: string;
        apellidoMaterno: string;
    } | null;
    requested_by_user: {
        email: string;
    } | null;
}

/**
 * Obtiene todas las solicitudes de eliminación de documentos, incluyendo detalles del socio
 * y el email del usuario que solicitó la eliminación.
 */
export async function fetchDeletionRequests() {
    // Usamos un cast a 'any' seguido del tipo esperado para evitar el error del Parser de Supabase
    // que no reconoce correctamente el join con auth.users o campos renombrados.
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .select(`
            *,
            socio_titulares (dni, nombres, apellidoPaterno, apellidoMaterno),
            requested_by_user:requested_by(email)
        `)
        .order('created_at', { ascending: false }) as { data: RawDeletionRequest[] | null, error: any };

    if (error) {
        console.error('Error fetching deletion requests:', error);
        throw new Error(error.message);
    }
    
    if (!data) return [];

    // Mapear los datos para aplanar la estructura y facilitar el uso en la tabla
    return data.map(req => ({
        ...req,
        socio_details: req.socio_titulares,
        requested_by_email: req.requested_by_user?.email || 'N/A'
    }));
}

/**
 * Actualiza el estado de una solicitud de eliminación y, si es aprobada, elimina el documento asociado.
 */
export async function updateDeletionRequestStatus(requestId: string, status: 'Approved' | 'Rejected', adminId: string) {
    const updateData: Partial<DeletionRequest> = {
        request_status: status,
    };

    if (status === 'Approved') {
        updateData.approved_by = adminId;
        updateData.approved_at = new Date().toISOString();
    }

    const { data: updatedRequest, error: updateError } = await supabase
        .from('document_deletion_requests')
        .update(updateData)
        .eq('id', requestId)
        .select();

    if (updateError) {
        console.error(`Error updating request ${requestId} to ${status}:`, updateError);
        throw new Error(updateError.message);
    }

    if (status === 'Approved' && updatedRequest && updatedRequest.length > 0) {
        const documentIdToDelete = updatedRequest[0].document_id;
        
        const { error: deleteError } = await supabase
            .from('socio_documentos')
            .delete()
            .eq('id', documentIdToDelete);

        if (deleteError) {
            console.error(`CRITICAL: Failed to delete document ${documentIdToDelete} after approval:`, deleteError);
            throw new Error(`Aprobación exitosa, pero falló la eliminación del documento: ${deleteError.message}`);
        }
    }

    return updatedRequest;
}
