import api from './api';

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/password/forgot', { email }, { timeout: 60000 });
  return data;
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const { data } = await api.post('/auth/password/verify-otp', { email, otp }, { timeout: 30000 });
  return data;
}

export async function resetPassword({ resetToken, newPassword, confirmPassword }) {
  const { data } = await api.post(
    '/auth/password/reset',
    { resetToken, newPassword, confirmPassword },
    { timeout: 30000 }
  );
  return data;
}
