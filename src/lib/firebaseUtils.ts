import { format } from 'date-fns';
import { OperationType } from '../constants/operations';
import { FirestoreErrorInfo } from '../types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Use a safer way to get the error message and avoid direct auth dependency if possible
  // We can't easily get the current user here without importing auth, 
  // but many calls to this function are from contexts where we have the user.
  // For now, let's just log the error and not try to attach auth info here, 
  // or use the global firebase auth if available without a static import cycle.
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined,
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
      tenantId: undefined,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function safeFormatDate(dateStr: string | undefined, formatStr: string, options?: any) {
  if (!dateStr) return 'Data não disponível';
  try {
    // Try to handle both YYYY-MM-DD and other formats
    const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return 'Data inválida';
    return format(date, formatStr, options);
  } catch (e) {
    return 'Erro na data';
  }
}
