import { format } from 'date-fns';
import { auth } from '../firebase';
import { OperationType, FirestoreErrorInfo } from '../types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
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
