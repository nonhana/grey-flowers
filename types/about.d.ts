export interface SNSItem {
  icon: SNSNames
  name: string
  to: string
  bgColor: string
  iconColor: string
}

export type SNSNames
  = | 'GitHub'
    | 'QQ'
    | 'X'
    | 'Telegram'
    | 'RSS'
    | 'CloudMusic'
    | 'Mail'
