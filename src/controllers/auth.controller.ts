import * as authService from '../services/auth.service';
import { signInSchema, signUpSchema } from '../validators/auth.validator';

export async function signUp(request: any, response: any) {
  const input = signUpSchema.parse(request.body);
  const session = await authService.signUp(input.email, input.password, input.username);
  response.status(201).json({ data: session });
}

export async function signIn(request: any, response: any) {
  const input = signInSchema.parse(request.body);
  const session = await authService.signIn(input.email, input.password);
  response.json({ data: session });
}

export async function signOut(request: any, response: any) {
  const authorization = request.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  const result = await authService.signOut(token);
  response.json({ data: result });
}