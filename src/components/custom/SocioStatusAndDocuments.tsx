import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, UploadCloud, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useTransition, useCallback } from 'react';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Lot } from '@/lib/types'; 
import LotRow from './LotRow'; 

interface SocioStatusAndDocumentsProps {
  socioId: string;
}

function SocioStatusAndDocuments({ socioId }: SocioStatusAndDocumentsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [lotToDeselectId, setLotToDeselectId] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();

  const getPaymentStatusBadge = useCallback((status: Lot['paymentStatus']) => {
    const base = "px-2 py-0.5 rounded-full text-xs font-semibold";
    switch (status) {
        case 'Pagado':
            return <span className={cn(base, "bg-success/20 text-success")}>Pagado</span>;
        case 'Pendiente':
            return <span className={cn(base, "bg-warning/20 text-warning")}>Pendiente</span>;
        case 'Atrasado':
            return <span className={cn(base, "bg-error/20 text-error")}>Atrasado</span>;
        default:
            return <span className={cn(base, "bg-textSecondary/10 text-textSecondary")}>N/A</span>;
    }
  }, []);

  useEffect(() => {
    const fetchStatusAndLot = async () => {
      if (!socioId) return;
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('socio_titulares')
        .select('mz, lote, is_lote_medido, nombres, apellidoPaterno, apellidoMaterno, dni')
        .eq('id', socioId)
        .single();

      if (error) {
        console.error('Error fetching socio status:', error.message);
        toast.error('Error al cargar estado de ingeniería', { description: error.message });
        setIsLoading(false);
        return;
      } 
      
      if (data) {
        const socioFullName = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
        const socioDni = data.dni;

        const primaryLot: Lot = {
          id: socioId, 
          mz: data.mz || 'N/A',
          lote: data.lote || 'N/A',
          is_lote_medido: data.is_lote_medido || false,
          isPrimary: true,
          fullName: socioFullName,
          dni: socioDni,
          paymentStatus: 'Pagado',
          receiptNumber: 'R-2025-001',
          documentLink: 'https://example.com/doc/primary',
        };

        const mockLots: Lot[] = [
          { 
            id: 'mock-1', 
            mz: 'B', 
            lote: '10', 
            is_lote_medido: false, 
            isPrimary: false,
            fullName: socioFullName,
            dni: socioDni,
            paymentStatus: 'Pendiente',
            receiptNumber: 'N/A',
            documentLink: null,
          },
          { 
            id: 'mock-2', 
            mz: 'C', 
            lote: '5', 
            is_lote_medido: true, 
            isPrimary: false,
            fullName: socioFullName,
            dni: socioDni,
            paymentStatus: 'Atrasado',
            receiptNumber: 'R-2024-150',
            documentLink: 'https://example.com/doc/mock2',
          },
        ];

        const initialLots = (primaryLot.mz !== 'N/A' || primaryLot.lote !== 'N/A') 
          ? [primaryLot, ...mockLots] 
          : mockLots;

        setLots(initialLots);
        
        const initialSelected = initialLots
          .filter(lot => lot.is_lote_medido)
          .map(lot => lot.id);
        setSelectedLotIds(initialSelected);
      }
      setIsLoading(false);
    };
    fetchStatusAndLot();
  }, [socioId]);

  const handleSelectAll = useCallback((checked: boolean) => {
    startTransition(() => {
      if (checked) {
        setSelectedLotIds(lots.map(lot => lot.id));
      } else {
        setSelectedLotIds([]);
      }
    });
  }, [lots]);

  const handleSelectLot = useCallback((lotId: string, checked: boolean) => {
    if (checked) {
      startTransition(() => {
        setSelectedLotIds(prev => [...prev, lotId]);
      });
    } else {
      setLotToDeselectId(lotId);
      setIsConfirmDialogOpen(true);
    }
  }, [startTransition]);
  
  const handleConfirmDeselection = useCallback(() => {
    if (lotToDeselectId) {
      startTransition(() => {
        setSelectedLotIds(prev => prev.filter(id => id !== lotToDeselectId));
      });
      
      const lotInfo = lots.find(l => l.id === lotToDeselectId);
      toast.warning('Lote marcado como PENDIENTE', {
        description: `El lote ${lotInfo?.mz}-${lotInfo?.lote} ha sido deseleccionado. Presione 'Guardar' para aplicar el cambio.`,
        duration: 5000,
      });
    }
    setLotToDeselectId(null);
    setIsConfirmDialogOpen(false);
  }, [lotToDeselectId, lots, startTransition]);

  const handleCancelDeselection = useCallback(() => {
    setLotToDeselectId(null);
    setIsConfirmDialogOpen(false);
  }, []);

  const handleBulkUpdate = async () => {
    setIsSubmitting(true);
    const primaryLot = lots.find(lot => lot.isPrimary);
    
    if (!primaryLot) {
      toast.error('Error', { description: 'No se encontró el lote principal para actualizar.' });
      setIsSubmitting(false);
      return;
    }

    const newPrimaryStatus = selectedLotIds.includes(primaryLot.id);

    try {
      const { error } = await supabase
        .from('socio_titulares')
        .update({ is_lote_medido: newPrimaryStatus })
        .eq('id', socioId);

      if (error) throw error;
      
      const updatedLots = lots.map(lot => ({
        ...lot,
        is_lote_medido: selectedLotIds.includes(lot.id)
      }));
      setLots(updatedLots);

      toast.success('Estado de lotes actualizado', { 
        description: `Se actualizó el estado de medición del lote principal (${primaryLot.mz}-${primaryLot.lote}).` 
      });

    } catch (submitError: any) {
      console.error('Error al guardar el estado:', submitError.message);
      toast.error('Error al guardar estado', { description: submitError.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSelected = lots.length > 0 && selectedLotIds.length === lots.length;
  const someSelected = selectedLotIds.length > 0 && selectedLotIds.length < lots.length;
  
  const lotInfoForDialog = lotToDeselectId 
    ? lots.find(l => l.id === lotToDeselectId) 
    : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8 bg-surface rounded-xl shadow-2xl border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-textSecondary">Cargando estado de ingeniería...</span>
      </div>
    );
  }

  return (
    <>
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCancelDeselection}
        onConfirm={handleConfirmDeselection}
        title="Confirmar Deselección de Lote Medido"
        description="¿Está seguro de que desea marcar este lote como PENDIENTE de medición? Este cambio solo se aplicará al presionar 'Guardar'."
        confirmButtonText="Sí, Deseleccionar"
        data={{
          Lote: lotInfoForDialog ? `${lotInfoForDialog.mz}-${lotInfoForDialog.lote}` : 'N/A',
          Estado_Actual: 'MEDIDO',
          Nuevo_Estado: 'PENDIENTE',
        }}
      />

      <div className="space-y-8 p-6 bg-surface rounded-xl shadow-2xl border border-border">
        <h2 className="text-2xl font-bold text-primary border-b border-border pb-3 flex items-center">
          <FileText className="w-6 h-6 mr-2 text-accent" />
          Gestión de Lotes y Documentos
        </h2>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-secondary">Detalle de Lotes y Documentación</h3>
          
          <div className="rounded-xl border border-border overflow-x-auto shadow-lg">
            <Table className="min-w-[1200px]">
              <TableHeader className="bg-background/70 sticky top-0">
                <TableRow className="hover:bg-background/70">
                  <TableHead className="w-[50px] text-secondary">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Seleccionar todos"
                      className="h-5 w-5 border-secondary data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground"
                    />
                  </TableHead>
                  <TableHead className="text-secondary w-[200px]">Nombre Completo</TableHead>
                  <TableHead className="text-secondary w-[120px]">DNI</TableHead>
                  <TableHead className="text-secondary w-[80px]">Mz</TableHead>
                  <TableHead className="text-secondary w-[80px]">Lote</TableHead>
                  <TableHead className="text-secondary w-[120px]">Estado de Pago</TableHead>
                  <TableHead className="text-secondary w-[120px]">N° Recibo</TableHead>
                  <TableHead className="text-secondary w-[100px] text-center">Documentos</TableHead>
                  <TableHead className="text-secondary w-[100px] text-center">Subir Doc.</TableHead>
                  <TableHead className="text-secondary w-[100px] text-right">Tipo Lote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-textSecondary">
                      No hay lotes registrados para este socio.
                    </TableCell>
                  </TableRow>
                ) : (
                  lots.map((lot) => {
                    const isSelected = selectedLotIds.includes(lot.id);
                    return (
                      <LotRow
                        key={lot.id}
                        lot={lot}
                        isSelected={isSelected}
                        handleSelectLot={handleSelectLot}
                        getPaymentStatusBadge={getPaymentStatusBadge}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-xl font-semibold text-accent">Carga de Archivos Generales</h3>
          <div className="border-2 border-dashed border-border p-8 rounded-xl text-center bg-background/50">
            <UploadCloud className="w-10 h-10 mx-auto text-accent mb-3" />
            <p className="text-textSecondary">
              Arrastre y suelte los planos o memorias descriptivas aquí.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            type="button" 
            onClick={handleBulkUpdate} 
            disabled={isSubmitting || isPending}
            className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              `Guardar Estado de ${selectedLotIds.length} Lote(s)`
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

export default SocioStatusAndDocuments;
