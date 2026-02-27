export class CreateUserDto {
  name: string;
  email: string;
  password: string; // plain for now, will hash later
  role: 'ADMIN' | 'FORMATEUR' | 'STUDENT';
  formateurStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  bio?: string;
  dateOfBirth?: string;
}
