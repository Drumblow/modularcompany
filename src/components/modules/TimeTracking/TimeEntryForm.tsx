'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTimeEntries, TimeEntryFormData } from '@/hooks/useTimeEntries';
import { Toast } from '@/components/ui/Toast';
import { devLog, devWarn, devError } from '@/lib/logger';

interface TimeEntryFormProps {
  onSuccess?: () => void;
  initialData?: Partial<TimeEntryFormData>;
  mode?: 'create' | 'edit';
  entryId?: string;
}

export function TimeEntryForm({ 
  onSuccess, 
  initialData,
  mode = 'create',
  entryId
}: TimeEntryFormProps) {
  const { createEntry, updateEntry, loading: apiLoading, error: apiError } = useTimeEntries();
  const [formError, setFormError] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TimeEntryFormData>({
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      observation: initialData?.observation || '',
      totalHours: initialData?.totalHours || 0,
    },
  });

  const watchStartTime = watch('startTime');
  const watchEndTime = watch('endTime');

  // Calcula o total de horas quando os horários são alterados
  React.useEffect(() => {
    if (watchStartTime && watchEndTime) {
      const start = new Date(`2000-01-01T${watchStartTime}`);
      const end = new Date(`2000-01-01T${watchEndTime}`);
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const roundedHours = parseFloat(diffHours.toFixed(2));
        setTotalHours(roundedHours);
        setValue('totalHours', roundedHours);
      } else {
        setTotalHours(null);
        setValue('totalHours', 0);
      }
    }
  }, [watchStartTime, watchEndTime, setValue]);

  const handleFormSubmit = async (data: TimeEntryFormData) => {
    setFormError(null);
    
    try {
      if (mode === 'create') {
        const result = await createEntry(data);
        if (result) {
          setShowSuccessToast(true);
          reset({
            date: new Date().toISOString().split('T')[0],
            startTime: '',
            endTime: '',
            observation: '',
            totalHours: 0,
          });
          setTotalHours(null);
          
          if (onSuccess) {
            onSuccess();
          }
        }
      } else if (mode === 'edit' && entryId) {
        const result = await updateEntry(entryId, data);
        if (result) {
          setShowSuccessToast(true);
          
          if (onSuccess) {
            onSuccess();
          }
        }
      }
    } catch (err: any) {
      devError('Erro ao processar o formulário:', err);
      setFormError(err.message || 'Ocorreu um erro ao processar o formulário');
    }
  };

  // Melhorando o comportamento do toast
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Registrar Horas Trabalhadas' : 'Editar Registro de Horas'}
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                Data
              </label>
              <Input
                id="date"
                type="date"
                {...register('date', { required: 'Data é obrigatória' })}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="startTime" className="text-sm font-medium">
                  Hora de Entrada
                </label>
                <Input
                  id="startTime"
                  type="time"
                  {...register('startTime', { required: 'Hora de entrada é obrigatória' })}
                />
                {errors.startTime && (
                  <p className="text-sm text-red-500">{errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="endTime" className="text-sm font-medium">
                  Hora de Saída
                </label>
                <Input
                  id="endTime"
                  type="time"
                  {...register('endTime', { required: 'Hora de saída é obrigatória' })}
                />
                {errors.endTime && (
                  <p className="text-sm text-red-500">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            {totalHours !== null && (
              <div className="rounded-md bg-primary/10 p-3">
                <p className="text-sm font-medium">
                  Total de horas: <span className="font-bold">{totalHours} horas</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="observation" className="text-sm font-medium">
                Observação
              </label>
              <textarea
                id="observation"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('observation')}
              />
            </div>

            {(formError || apiError) && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm font-medium text-red-500">
                  {(formError || apiError)?.includes('Conflito de horários') 
                    ? 'Conflito de horários detectado!' 
                    : formError || apiError}
                </p>
                
                {(formError || apiError)?.includes('Conflitos:') && (
                  <div className="mt-2">
                    <p className="text-xs text-red-500">Você já tem registros nos seguintes horários:</p>
                    <ul className="list-disc pl-5 mt-1 text-xs text-red-500">
                      {(formError || apiError)
                        ?.split('Conflitos:')[1]
                        ?.split(',')
                        .map((conflict, index) => (
                          <li key={index}>{conflict.trim()}</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-red-500">
                      Por favor, escolha horários que não se sobreponham aos registros existentes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={apiLoading}>
              {apiLoading 
                ? (mode === 'create' ? 'Registrando...' : 'Atualizando...') 
                : (mode === 'create' ? 'Registrar Horas' : 'Atualizar Registro')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Toast 
        message={mode === 'create' ? 'Horas registradas com sucesso!' : 'Registro atualizado com sucesso!'} 
        type="success" 
        open={showSuccessToast} 
        onClose={() => setShowSuccessToast(false)} 
      />
    </>
  );
} 