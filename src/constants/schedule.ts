export interface ScheduleItem {
  time: string;
  activity: string;
  details?: string;
}

export interface DaySchedule {
  [day: string]: ScheduleItem[];
}

export interface GroupSchedule {
  id: string;
  name: string;
  ageRange?: string;
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
  days: DaySchedule;
}

export const CLASS_SCHEDULE: GroupSchedule[] = [
  {
    id: 'kindezis-01-manha',
    name: 'Kindezis 01',
    ageRange: '06 a 09 anos',
    shift: 'Manhã',
    days: {
      'Terça-feira': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '10:00 às 11:00', activity: 'Capoeira Angola', details: 'Contramestre Marcelo e Onilê - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' }
      ],
      'Quarta-feira': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Expressão Corporal', details: 'Tereza - Sala de saberes/ Espaço Kindezi' },
        { time: '10:00 às 11:00', activity: 'Afroletramento + Percussão', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' }
      ],
      'Quinta-feira': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Afroletramento', details: 'Davi - Espaço Kindezi / Salão de Conflências' },
        { time: '10:00 às 11:00', activity: 'Percussão', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' }
      ],
      'Sábado': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '10:00 às 11:00', activity: 'Roda de Capoeira', details: 'Salão Mestre Virgílio' }
      ]
    }
  },
  {
    id: 'kindezis-01-tarde',
    name: 'Kindezis 01',
    ageRange: '06 a 09 anos',
    shift: 'Tarde',
    days: {
      'Terça-feira': [
        { time: '12:00 às 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '13:30 às 14:00', activity: 'Acolhimento / pré-lanche' },
        { time: '14:00 às 15:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely e Monyra - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '14:40 às 15:30', activity: 'Capoeira Angola', details: 'Contramestre Marcelo e Onilê - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '15:30 às 16:00', activity: 'Ajeum/Lanche' }
      ],
      'Quarta-feira': [
        { time: '12:00 às 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '13:30 às 14:00', activity: 'Acolhimento / pré-lanche' },
        { time: '14:00 às 15:00', activity: 'Expressão Corporal', details: 'Tereza - Sala de saberes/ Espaço Kindezi' },
        { time: '14:40 às 15:30', activity: 'Capoeira Angola', details: 'Contramestre Marcelo - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '15:30 às 16:00', activity: 'Ajeum/Lanche' }
      ],
      'Quinta-feira': [
        { time: '12:00 às 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '13:30 às 14:00', activity: 'Acolhimento / pré-lanche' },
        { time: '14:00 às 15:00', activity: 'Afroletramento', details: 'Davi - Espaço Kindezi / Salão de Conflências' },
        { time: '14:40 às 15:30', activity: 'Percussão', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '15:30 às 16:00', activity: 'Ajeum/Lanche' }
      ]
    }
  },
  {
    id: 'kindezis-02-manha',
    name: 'Kindezis 02',
    ageRange: '10 a 12 anos',
    shift: 'Manhã',
    days: {
      'Terça-feira': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Capoeira Angola', details: 'Contramestre Marcelo e Onilê - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '10:00 às 11:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' }
      ],
      'Quarta-feira': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '10:00 às 11:00', activity: 'Expressão Corporal', details: 'Tereza - Sala de saberes/ Espaço Kindezi' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' }
      ],
      'Quinta-feira': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Percussão', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '10:00 às 11:00', activity: 'Afroletramento', details: 'Davi - Espaço Kindezi / Salão de Conflências' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' }
      ],
      'Sábado': [
        { time: '08:30 às 09:00', activity: 'Acolhimento / pré-lanche' },
        { time: '09:00 às 10:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '10:00 às 11:00', activity: 'Roda de Capoeira', details: 'Salão Mestre Virgílio' }
      ]
    }
  },
  {
    id: 'kindezis-02-tarde',
    name: 'Kindezis 02',
    ageRange: '10 a 12 anos',
    shift: 'Tarde',
    days: {
      'Terça-feira': [
        { time: '12:00 - 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '13:30 às 14:00', activity: 'Acolhimento / pré-lanche' },
        { time: '14:00 às 15:00', activity: 'Capoeira Angola', details: 'Contramestre Marcelo e Onilê - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '15:00 às 16:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely e Monyra - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ],
      'Quarta-feira': [
        { time: '12:00 - 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '13:30 às 14:00', activity: 'Acolhimento / pré-lanche' },
        { time: '14:00 às 15:00', activity: 'Capoeira Angola', details: 'Contramestre Marcelo - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '15:00 às 16:00', activity: 'Expressão Corporal', details: 'Tereza - Sala de saberes/ Espaço Kindezi' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ],
      'Quinta-feira': [
        { time: '12:00 - 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '13:30 às 14:00', activity: 'Acolhimento / pré-lanche' },
        { time: '14:00 às 15:00', activity: 'Percussão', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '15:00 às 16:00', activity: 'Afroletramento', details: 'Davi - Espaço Kindezi / Salão de Conflências' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ]
    }
  },
  {
    id: 'ndezis-jovens',
    name: 'Ndezis e Jovens Multiplicadores',
    shift: 'Integral',
    days: {
      'Terça-feira': [
        { time: '09:00 às 11:00', activity: 'Informática com Manutenção / Liderança e Gestão', details: 'Felipe Brito / Mestre Roxinho' },
        { time: '12:00 - 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '15:00 às 17:00', activity: 'Informática com Manutenção / Liderança e Gestão', details: 'Felipe Brito / Mestre Roxinho' },
        { time: '17:00 às 17:30', activity: 'Ajeum/Lanche' },
        { time: '17:30 às 19:00', activity: 'Capoeira Angola / Arco Sonoro', details: 'CM Marcelo - Espaço Kindezi / Salão Mestre Virgílio' }
      ],
      'Quarta-feira': [
        { time: '09:00 às 11:00', activity: 'Historicidade da ilha de Itaparica / Liderança e Gestão', details: 'Felipe Brito / Mestre Roxinho' },
        { time: '12:00 - 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '15:00 às 17:00', activity: 'Historicidade da ilha de Itaparica / Liderança e Gestão', details: 'Felipe Brito / Mestre Roxinho' },
        { time: '17:00 às 17:30', activity: 'Ajeum/Lanche' },
        { time: '17:30 às 19:00', activity: 'Capoeira Angola / Arco Sonoro', details: 'CM Marcelo - Espaço Kindezi / Salão Mestre Virgílio' }
      ],
      'Quinta-feira': [
        { time: '09:00 às 11:00', activity: 'Capoeira Angola / Arco sonoro', details: 'CM Marcelo - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '12:00 - 13:00', activity: 'Ajeum/Almoço Equipe' },
        { time: '15:00 às 17:00', activity: 'Capoeira Angola / Arco sonoro', details: 'CM Marcelo - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '17:00 às 17:30', activity: 'Ajeum/Lanche' }
      ],
      'Sábado': [
        { time: '08:00 às 09:00', activity: 'LETRAMENTO - ENEM', details: 'Davi e Marcelo / Espaço Kindezi' },
        { time: '09:00 às 10:00', activity: 'Dança', details: 'Keu e Jenifer - Espaço Kindezis' },
        { time: '10:00 às 11:00', activity: 'Roda de Capoeira', details: 'Salão Mestre Virgílio' }
      ]
    }
  },
  {
    id: 'mulheres-candaces',
    name: 'Mulheres Candaces',
    shift: 'Integral',
    days: {
      'Terça-feira': [
        { time: '14:00 às 15:00', activity: 'Artesanato com Couro / Bordado', details: 'Virgínia - Casa das Candaces' },
        { time: '15:00– 16:00', activity: 'Samba de Roda', details: 'Enely - Espaço Kindezi / Salão do Mestre Virgílio' },
        { time: '16:00 às 17:00', activity: 'Mulheres de Axé', details: 'Mestre Roxinho – Salão Mestre Virgílio' }
      ],
      'Quarta-feira': [
        { time: '14:00 às 15:00', activity: 'Artesanato com Couro / Bordado', details: 'Virgínia - Casa das Candaces' },
        { time: '15:00– 16:00', activity: 'Capoeira Angola', details: 'Sthephane – Salão Mestre Virgílio' }
      ],
      'Quinta-feira': [
        { time: '07:30 às 08:30', activity: 'Expressão Corporal / Yoga', details: 'Tereza' },
        { time: '15:00– 16:00', activity: 'Samba de Roda', details: 'Enely - Espaço Kindezi / Salão do Mestre Virgílio' },
        { time: '16:30 às 17:30', activity: 'Mulheres de Axé', details: 'Mestre Roxinho – Salão Mestre Virgílio' }
      ],
      'Sábado': [
        { time: '08:00 às 09:00', activity: 'Dança', details: 'Keu e Jenifer - Espaço Kindezis' },
        { time: '09:00 às 10:00', activity: 'Afroletramento + Percussão Recicla', details: 'Enely - Espaço Kindezi / Salão Mestre Virgílio' },
        { time: '10:00 às 11:00', activity: 'Roda de Capoeira', details: 'Salão Mestre Virgílio' }
      ]
    }
  },
  {
    id: 'katinguele-salvador',
    name: 'Katinguelê - Núcleo Salvador',
    shift: 'Integral',
    days: {
      'Terça-feira': [
        { time: '09:00 às 10:00', activity: 'Afroletramento', details: 'Davi - Sala de Atividades' },
        { time: '10:00 às 11:00', activity: 'Capoeira Angola', details: 'Marcos - Salão (laje)' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' },
        { time: '14:00 às 15:00', activity: 'Afroletramento', details: 'Davi - Sala de Atividades' },
        { time: '15:00 às 16:00', activity: 'Capoeira Angola', details: 'Marcos - Salão (laje)' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ],
      'Quarta-feira': [
        { time: '09:00 às 10:00', activity: 'Percussão', details: 'M. Pingo - Salão (laje)' },
        { time: '10:00 às 11:00', activity: 'Capoeira Angola', details: 'M. Pingo - Salão (laje)' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' },
        { time: '14:00 às 15:00', activity: 'Percussão', details: 'M. Pingo - Salão (laje)' },
        { time: '15:00 às 16:00', activity: 'Capoeira Angola', details: 'M. Pingo - Salão (laje)' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ],
      'Quinta-feira': [
        { time: '09:00 às 10:00', activity: 'Afroletramento', details: 'Monyra - Sala de Atividades' },
        { time: '10:00 às 11:00', activity: 'Capoeira Angola', details: 'Marcos - Salão (laje)' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' },
        { time: '14:00 às 15:00', activity: 'Afroletramento', details: 'Monyra - Sala de Atividades' },
        { time: '15:00 às 16:00', activity: 'Capoeira Angola', details: 'Marcos - Salão (laje)' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ],
      'Sexta-feira': [
        { time: '09:00 às 10:00', activity: 'Afroletramento', details: 'Davi - Sala de Atividades' },
        { time: '10:00 às 11:00', activity: 'Capoeira Angola', details: 'Davi - Salão (laje)' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' },
        { time: '14:00 às 15:00', activity: 'Afroletramento', details: 'Davi - Sala de Atividades' },
        { time: '15:00 às 16:00', activity: 'Capoeira Angola', details: 'Davi - Salão (laje)' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ]
    }
  },
  {
    id: 'mulheres-candaces-salvador',
    name: 'Mulheres Candaces - Núcleo Salvador',
    shift: 'Integral',
    days: {
      'Terça-feira': [
        { time: '09:00 às 11:00', activity: 'Bordado', details: 'Laíse' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' },
        { time: '14:00 às 16:00', activity: 'Bordado', details: 'Laíse' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ],
      'Quinta-feira': [
        { time: '09:00 às 11:00', activity: 'Bordado', details: 'Laíse' },
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' },
        { time: '14:00 às 16:00', activity: 'Bordado', details: 'Laíse' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ],
      'Sexta-feira': [
        { time: '11:00 às 11:30', activity: 'Ajeum/Lanche' },
        { time: '14:00 às 16:00', activity: 'Dança', details: 'Keu' },
        { time: '16:00 às 16:30', activity: 'Ajeum/Lanche' }
      ]
    }
  }
];
