import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/UserContext';
import { useSearchParams } from 'react-router-dom';
import DeletionRequestsTable from '@/components/documents/DeletionRequestsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const MyDocumentsView = () => (
    <Card className="bg-surface border-border shadow-xl">
        <CardHeader>
            <CardTitle className="text-primary">Mis Documentos Cargados</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-textSecondary mb-4">
                Esta sección mostrará los documentos que has subido o que están asociados a tu perfil de socio. 
                Aquí podrás solicitar la eliminación de documentos sensibles como planos o memorias descriptivas.
            </p>
            <div className="h-64 flex items-center justify-center bg-background/50 rounded-lg border border-dashed border-border">
                <div className="text-center text-textSecondary">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/50 mx-auto mb-2" />
                    <p>Funcionalidad de carga y gestión de documentos en desarrollo...</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

const PartnerDocumentsPage = () => {
    const { roles, loading } = useUser();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const isAdmin = roles?.includes('admin');
    const initialTab = searchParams.get('tab') || (isAdmin ? 'requests' : 'my-documents');

    const handleTabChange = (value: string) => {
        setSearchParams({ tab: value }, { replace: true });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-foreground border-b border-border pb-2">Gestión de Documentos</h1>
            
            <Tabs value={initialTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full lg:w-[400px] grid-cols-2 bg-surface border border-border p-1">
                    <TabsTrigger value="my-documents">Mis Documentos</TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger 
                            value="requests" 
                            className="data-[state=active]:bg-accent data-[state=active]:text-background font-semibold"
                        >
                            Solicitudes (Admin)
                        </TabsTrigger>
                    )}
                </TabsList>
                
                <TabsContent value="my-documents" className="mt-6">
                    <MyDocumentsView />
                </TabsContent>
                
                {isAdmin && (
                    <TabsContent value="requests" className="mt-6">
                        <DeletionRequestsTable />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default PartnerDocumentsPage;
