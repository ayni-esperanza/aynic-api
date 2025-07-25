import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RecordStatusHistoryService } from './record-status-history.service';
import { CreateRecordStatusHistoryDto } from './dto/create-record-status-history.dto';
import { UpdateRecordStatusHistoryDto } from './dto/update-record-status-history.dto';

@Controller('record-status-history')
export class RecordStatusHistoryController {
  constructor(private readonly recordStatusHistoryService: RecordStatusHistoryService) {}

  @Post()
  create(@Body() createRecordStatusHistoryDto: CreateRecordStatusHistoryDto) {
    return this.recordStatusHistoryService.create(createRecordStatusHistoryDto);
  }

  @Get()
  findAll() {
    return this.recordStatusHistoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recordStatusHistoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRecordStatusHistoryDto: UpdateRecordStatusHistoryDto) {
    return this.recordStatusHistoryService.update(+id, updateRecordStatusHistoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recordStatusHistoryService.remove(+id);
  }
}
