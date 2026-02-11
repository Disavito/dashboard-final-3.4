import React, { useCallback } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Download, UploadCloud } from 'lucide-react';
import { Lot } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LotRowProps {
  lot: Lot;
  isSelected: boolean;
  handleSelectLot: (lotId: string, checked: boolean) => void;
  getPaymentStatusBadge: (status: Lot['paymentStatus']) => JSX.Element;
}

/**
 * Fila individual para la tabla de lotes dentro del diálogo de estado de ingeniería.
 * Memoizado para evitar re-renders innecesarios.
 */
const LotRow: React.FC<LotRowProps> = React.memo(({
  lot,
  isSelected,
  handleSelectLot,
  getPaymentStatusBadge,
}) => {
  const onCheckedChange = useCallback((checked: boolean | 'indeterminate') => {
    if (checked !== 'indeterminate') {
      handleSelectLot(lot.id, checked);
    }
  }, [lot.id, handleSelectLot]);

  const handleDownload = () => {
    if (lot.documentLink) {
      window.open(lot.documentLink, '_blank');
    }
  };

  return (
    <TableRow 
      key={lot.id} 
      className={cn(
        "hover:bg-background/50 transition-colors",
        lot.isPrimary ? "bg-primary/5 border-l-4 border-primary/50" : ""
      )}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onCheckedChange}
          aria-label={`Seleccionar lote ${lot.mz}-${lot.lote}`}
          className="h-5 w-5 border-border data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground"
        />
      </TableCell>
      <TableCell className="font-medium text-text">{lot.fullName}</TableCell>
      <TableCell className="text-textSecondary">{lot.dni}</TableCell>
      <TableCell className="text-text">{lot.mz}</TableCell>
      <TableCell className="text-text">{lot.lote}</TableCell>
      <TableCell>{getPaymentStatusBadge(lot.paymentStatus)}</TableCell>
      <TableCell className="text-textSecondary">{lot.receiptNumber || 'N/A'}</TableCell>
      
      {/* Columna de Documentos */}
      <TableCell className="text-center">
        {lot.documentLink ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-success hover:bg-success/10"
            onClick={handleDownload}
            title="Descargar Documento"
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-textSecondary/50 text-xs">N/A</span>
        )}
      </TableCell>
      
      {/* Columna de Subir Documento (Simulación) */}
      <TableCell className="text-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-accent hover:bg-accent/10"
          title="Subir Documento"
        >
          <UploadCloud className="h-4 w-4" />
        </Button>
      </TableCell>

      {/* Columna de Tipo Lote */}
      <TableCell className="text-right">
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          lot.isPrimary ? "bg-primary/10 text-primary" : "bg-textSecondary/10 text-textSecondary"
        )}>
          {lot.isPrimary ? 'Principal' : 'Adicional'}
        </span>
      </TableCell>
    </TableRow>
  );
});

LotRow.displayName = 'LotRow';

export default LotRow;
