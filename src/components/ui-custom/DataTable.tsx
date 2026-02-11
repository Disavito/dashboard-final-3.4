import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  PaginationState,
  RowSelectionState,
  Table as TanstackTable,
  FilterFn,
  OnChangeFn,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmptyState from './EmptyState';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  globalFilter?: string;
  setGlobalFilter?: (filter: string) => void;
  customGlobalFilterFn?: FilterFn<TData>;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  renderAboveTable?: (tableInstance: TanstackTable<TData>) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
  // Props para estado vacío
  emptyTitle?: string;
  emptyDescription?: string;
  EmptyIcon?: LucideIcon;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  globalFilter,
  setGlobalFilter,
  customGlobalFilterFn,
  pagination,
  onPaginationChange,
  rowSelection,
  onRowSelectionChange,
  renderAboveTable,
  isLoading = false,
  className,
  emptyTitle = "No se encontraron resultados",
  emptyDescription = "Intenta ajustar tus filtros o criterios de búsqueda.",
  EmptyIcon,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: onPaginationChange,
    onRowSelectionChange: onRowSelectionChange,
    globalFilterFn: customGlobalFilterFn || 'auto',
    state: {
      sorting,
      globalFilter,
      ...(rowSelection !== undefined ? { rowSelection } : {}),
      ...(pagination !== undefined ? { pagination } : {}),
    },
    enableRowSelection: !!onRowSelectionChange,
  });

  const totalPages = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className={cn("w-full", className)}>
      {renderAboveTable && renderAboveTable(table)}

      <div className="rounded-xl border border-border overflow-hidden shadow-xl bg-surface/30">
        <Table>
          <TableHeader className="bg-surface/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-surface/80">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 text-textSecondary font-semibold text-sm whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-primary">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-lg font-medium">Cargando datos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-border hover:bg-surface/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    Icon={EmptyIcon}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4 px-2">
        <div className="flex-1 text-sm text-textSecondary">
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-textSecondary hidden sm:block">Filas por página</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-9 rounded-md border border-border bg-surface px-2 py-1 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium text-textSecondary">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 bg-surface border-border hover:bg-surface/80"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 bg-surface border-border hover:bg-surface/80"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
