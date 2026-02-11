import React from 'react';
import { FileText, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentLinkPillProps {
  type: string;
  link: string;
  canDelete: boolean; 
  onDelete: () => void;
}

const DocumentLinkPill: React.FC<DocumentLinkPillProps> = ({ type, link, canDelete, onDelete }) => {
  const requiresConfirmation = type === 'Planos de ubicación' || type === 'Memoria descriptiva';

  let colorClass = "bg-primary/10 text-primary hover:bg-primary/20";
  let icon = <FileText className="h-3 w-3 mr-1" />;

  if (type === 'Comprobante de Pago') {
    colorClass = "bg-success/10 text-success hover:bg-success/20";
  } else if (requiresConfirmation) {
    colorClass = "bg-accent/10 text-accent hover:bg-accent/20 border border-accent/50";
  }

  return (
    <div className="flex items-center group">
      <a 
        href={link} 
        target="_blank" 
        rel="noopener noreferrer"
        className={cn(
          "flex items-center text-xs font-medium px-2 py-1 rounded-l-full transition-colors duration-200",
          colorClass,
          canDelete ? "rounded-r-none" : "rounded-r-full"
        )}
      >
        {icon}
        {type}
      </a>
      
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 p-1 rounded-l-none rounded-r-full transition-colors duration-200",
            requiresConfirmation ? "bg-accent/20 text-accent hover:bg-accent/30" : "bg-error/20 text-error hover:bg-error/30"
          )}
          onClick={onDelete}
          title={requiresConfirmation ? "Solicitar Eliminación" : "Eliminar Documento"}
        >
          {requiresConfirmation ? (
            <Clock className="h-4 w-4" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
};

export default DocumentLinkPill;
