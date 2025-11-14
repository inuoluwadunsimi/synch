import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BankRepository } from '../bank/bank.repository';

@Injectable()
export class AdminService {
  constructor(private readonly bankRepository: BankRepository) {}
}
