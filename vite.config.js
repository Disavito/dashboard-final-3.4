import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Agrega el visualizador. Se ejecutará solo al hacer 'npm run build'
        visualizer({
            filename: 'stats.html', // Nombre del archivo de reporte
            open: true, // Abrir el reporte en el navegador automáticamente
            gzipSize: false,
            brotliSize: false,
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
    },
    build: {
        // Aumenta el límite de advertencia para el tamaño del chunk a 1000 kB
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                // Estrategia de división de código manual para optimizar los chunks
                manualChunks: function (id) {
                    // 1. Librerías Pesadas (PDF, Gráficos)
                    if (id.includes('jspdf') || id.includes('html2canvas')) {
                        return 'pdf-libs';
                    }
                    if (id.includes('recharts')) {
                        return 'chart-libs';
                    }
                    // 2. Core Frameworks (React, Router, Supabase, Query) - Esenciales para el shell
                    if (id.includes('react') ||
                        id.includes('react-dom') ||
                        id.includes('react-router-dom') ||
                        id.includes('@supabase/supabase-js') ||
                        id.includes('@tanstack/react-query')) {
                        return 'core-vendor';
                    }
                    // 3. UI/Utility Vendor (Radix, Lucide, Zod, Forms) - Componentes grandes de UI/Formularios
                    // Separamos estas dependencias para reducir el tamaño del chunk principal.
                    if (id.includes('@radix-ui') ||
                        id.includes('lucide-react') ||
                        id.includes('tailwind-merge') ||
                        id.includes('clsx') ||
                        id.includes('date-fns') ||
                        id.includes('react-hook-form') ||
                        id.includes('zod')) {
                        return 'ui-vendor';
                    }
                    // 4. General Vendor (El resto de node_modules)
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                },
            },
        },
    },
    preview: {
        host: true,
        allowedHosts: ['dashboard3-dashboard3.mv7mvl.easypanel.host']
    }
});
