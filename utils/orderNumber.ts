export async function createUniqueOrderNumber(prisma: any): Promise<string> {
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  while (true) {
    const newCode = generateCode()
    const existing = await prisma.purchase.findUnique({
      where: { orderNumber: newCode }
    })
    if (!existing) {
      return newCode
    }
  }
} 