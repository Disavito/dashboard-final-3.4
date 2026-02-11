import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { DataTable } from '@/components/ui-custom/DataTable';
import { 
  Loader2, 
  FolderSearch, 
  Check, 
  X, 
  Search, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import DocumentLinkPill from '@/components/custom/DocumentLinkPill';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { useUser } from '@/context/UserContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import usePendingRequests from '@/hooks/usePendingRequests';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Interfaces
interface SocioDocumento {
  id: string;
  tipo_documento: string;
  link_documento: string | null;
}

interface SocioConDocumentos {
  id: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  localidad: string;
  mz: string | null;
  lote: string | null;
  is_lote_medido: boolean | null;
  // Relación para verificar pagos
  ingresos: { id: number }[];
  socio_documentos: SocioDocumento[];
}

interface DeletionRequest {
  id: string;
  document_id: string;
  socio_id: string;
  requested_by: string;
  document_type: string;
  document_link: string;
  request_status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  socio_titulares: {
    nombres: string;
    apellidoPaterno: string;
    dni: string;
  };
}

function PartnerDocuments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'requests' ? 'requests' : 'documents';
  
  const [sociosConDocumentos, setSociosConDocumentos] = useState<SocioConDocumentos[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingRequests, setIsFetchingRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { pendingCount, canManageRequests } = usePendingRequests();
  const { user, roles, loading: userLoading } = useUser();
  
  const isAdmin = useMemo(() => roles?.includes('admin') ?? false, [roles]);
  const isEngineer = useMemo(() => roles?.includes('engineer') ?? false, [roles]);
  const canEditStatus = isAdmin || isEngineer;

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ 
    isOpen: boolean; 
    documentId: string | null; 
    documentType: string | null; 
    socioName: string | null; 
    actionType: 'immediate' | 'request' 
  }>({ 
    isOpen: false, 
    documentId: null, 
    documentType: null, 
    socioName: null, 
    actionType: 'immediate' 
  });

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchDeletionRequestsData = useCallback(async () => {
    if (!canManageRequests) return;
    setIsFetchingRequests(true);
    try {
      const { data, error } = await supabase
        .from('document_deletion_requests')
        .select(`
          *,
          socio_titulares (nombres, apellidoPaterno, dni)
        `)
        .eq('request_status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeletionRequests(data as unknown as DeletionRequest[]);
    } catch (error: any) {
      console.error('Error fetching deletion requests:', error.message);
    } finally {
      setIsFetchingRequests(false);
    }
  }, [canManageRequests]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Consultamos socios, sus documentos y verificamos si tienen ingresos (pagos)
      const { data, error } = await supabase
        .from('socio_titulares')
        .select(`
          id, dni, nombres, apellidoPaterno, apellidoMaterno, localidad, mz, lote, is_lote_medido,
          socio_documentos (id, tipo_documento, link_documento),
          ingresos:ingresos(id)
        `)
        .order('apellidoPaterno', { ascending: true });

      if (error) throw error;
      setSociosConDocumentos(data as unknown as SocioConDocumentos[]);
    } catch (error: any) {
      toast.error('Error al cargar socios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    if (canManageRequests) fetchDeletionRequestsData();
  }, [fetchAllData, canManageRequests, fetchDeletionRequestsData]);

  const handleToggleMedido = async (socioId: string, currentValue: boolean | null) => {
    if (!canEditStatus) return;
    
    const newValue = !currentValue;
    try {
      const { error } = await supabase
        .from('socio_titulares')
        .update({ is_lote_medido: newValue })
        .eq('id', socioId);

      if (error) throw error;
      
      setSociosConDocumentos(prev => prev.map(s => 
        s.id === socioId ? { ...s, is_lote_medido: newValue } : s
      ));
      toast.success(`Lote marcado como ${newValue ? 'Medido' : 'No Medido'}`);
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleUpdateStatus = async (request: DeletionRequest, newStatus: 'Approved' | 'Rejected') => {
    setIsProcessingAction(true);
    try {
      const { error: updateError } = await supabase
        .from('document_deletion_requests')
        .update({ 
          request_status: newStatus,
          approved_by: newStatus === 'Approved' ? user?.id : null,
          approved_at: newStatus === 'Approved' ? new Date().toISOString() : null,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      if (newStatus === 'Approved') {
        await supabase.from('socio_documentos').delete().eq('id', request.document_id);
        toast.success('Documento eliminado');
      } else {
        toast.info('Solicitud rechazada');
      }

      fetchDeletionRequestsData();
      fetchAllData();
    } catch (error) {
      toast.error('Error al procesar');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const columns: ColumnDef<SocioConDocumentos>[] = useMemo(() => [
    {
      accessorKey: 'nombres',
      header: 'Socio',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {row.original.apellidoPaterno} {row.original.apellidoMaterno}, {row.original.nombres}
          </span>
          <span className="text-xs text-textSecondary">{row.original.dni}</span>
        </div>
      ),
    },
    {
      id: 'mz_lote',
      header: 'Mz / Lote',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="bg-background border-border font-mono text-xs">
            {row.original.mz || '-'}
          </Badge>
          <span className="text-textSecondary">/</span>
          <Badge variant="outline" className="bg-background border-border font-mono text-xs">
            {row.original.lote || '-'}
          </Badge>
        </div>
      ),
    },
    {
      id: 'estado_pago',
      header: 'Estado Pago',
      cell: ({ row }) => {
        // Lógica: Si tiene al menos un registro en la tabla ingresos, está "Pagado"
        const hasIncomes = row.original.ingresos && row.original.ingresos.length > 0;
        
        return (
          <Badge 
            variant={hasIncomes ? "success" : "destructive"}
            className={cn(
              "flex w-fit items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold",
              hasIncomes && "bg-success/10 text-success border-success/20"
            )}
          >
            {hasIncomes ? (
              <><CheckCircle2 className="h-3 w-3" /> Pagado</>
            ) : (
              <><Clock className="h-3 w-3" /> No Pagado</>
            )}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'is_lote_medido',
      header: 'Medido',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox 
            checked={!!row.original.is_lote_medido}
            onCheckedChange={() => handleToggleMedido(row.original.id, row.original.is_lote_medido)}
            disabled={!canEditStatus}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
      )
    },
    {
      id: 'documentos',
      header: 'Documentos',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.socio_documentos?.length > 0 ? (
            row.original.socio_documentos.map(doc => (
              <DocumentLinkPill
                key={doc.id}
                type={doc.tipo_documento}
                link={doc.link_documento!}
                canDelete={canEditStatus}
                onDelete={() => setDeleteConfirmState({
                  isOpen: true,
                  documentId: doc.id,
                  documentType: doc.tipo_documento,
                  socioName: `${row.original.nombres} ${row.original.apellidoPaterno}`,
                  actionType: (isAdmin || !["Planos de ubicación", "Memoria descriptiva"].includes(doc.tipo_documento)) ? 'immediate' : 'request'
                })}
              />
            ))
          ) : (
            <span className="text-xs text-textSecondary italic">Sin documentos</span>
          )}
        </div>
      ),
    }
  ], [canEditStatus, isAdmin]);

  const requestColumns: ColumnDef<DeletionRequest>[] = useMemo(() => [
    {
      accessorKey: 'created_at',
      header: 'Fecha',
      cell: ({ row }) => format(new Date(row.original.created_at), 'dd/MM/yy HH:mm'),
    },
    {
      accessorKey: 'socio_titulares.nombres',
      header: 'Socio',
      cell: ({ row }) => `${row.original.socio_titulares?.nombres} ${row.original.socio_titulares?.apellidoPaterno}`,
    },
    {
      accessorKey: 'document_type',
      header: 'Documento',
      cell: ({ row }) => <Badge variant="outline" className="bg-background">{row.original.document_type}</Badge>,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="success" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => handleUpdateStatus(row.original, 'Approved')} 
            disabled={isProcessingAction}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => handleUpdateStatus(row.original, 'Rejected')} 
            disabled={isProcessingAction}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [isProcessingAction]);

  if (loading || userLoading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-primary h-10 w-10 mx-auto mb-4" />
        <p className="text-textSecondary animate-pulse">Cargando expedientes...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Card className="bg-surface border-border shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-surface/50 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3 text-primary text-2xl font-bold">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderSearch className="h-6 w-6 text-primary" />
              </div>
              Gestión de Documentos
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary" />
                <Input 
                  placeholder="Buscar socio o DNI..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-9 bg-background border-border focus:ring-primary h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Tabs value={currentTab} onValueChange={(v) => setSearchParams({ tab: v === 'requests' ? 'requests' : '' })}>
            <TabsList className="mb-6 bg-background border border-border p-1 w-fit">
              <TabsTrigger value="documents" className="data-[state=active]:bg-surface flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos
              </TabsTrigger>
              {canManageRequests && (
                <TabsTrigger value="requests" className="relative data-[state=active]:bg-surface flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Solicitudes 
                  {pendingCount > 0 && (
                    <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="documents" className="space-y-4 outline-none">
              <DataTable 
                columns={columns} 
                data={sociosConDocumentos.filter(s => 
                  `${s.nombres} ${s.apellidoPaterno} ${s.dni}`.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                pagination={pagination} 
                onPaginationChange={setPagination} 
              />
            </TabsContent>

            {canManageRequests && (
              <TabsContent value="requests" className="outline-none">
                {isFetchingRequests ? (
                  <div className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary h-10 w-10 mb-2" />
                    <p className="text-textSecondary">Cargando solicitudes pendientes...</p>
                  </div>
                ) : (
                  <DataTable 
                    columns={requestColumns} 
                    data={deletionRequests} 
                    pagination={pagination} 
                    onPaginationChange={setPagination} 
                  />
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
          toast.info("Acción procesada correctamente");
        }}
        title={deleteConfirmState.actionType === 'request' ? "Solicitar Eliminación" : "Eliminar Documento"}
        description={`¿Estás seguro de que deseas ${deleteConfirmState.actionType === 'request' ? 'solicitar la eliminación' : 'eliminar permanentemente'} el documento "${deleteConfirmState.documentType}" del socio ${deleteConfirmState.socioName}?`}
        data={{}}
      />
    </div>
  );
}

export default PartnerDocuments;
