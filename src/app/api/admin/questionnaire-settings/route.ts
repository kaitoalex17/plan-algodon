import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CONFIG = {
  // attenuation limit
  threshold: 22.99,
  noSignalValue: 70.0,
  
  // Ubicacion options
  ubicacion: {
    label_es: "Dónde se encuentra la CTO",
    label_uk: "Де знаходиться CTO",
    options: [
      { es: "Interior > en techo falso", uk: "Внутрішній > у підвісній стелі" },
      { es: "Interior > en la pared", uk: "Внутрішній > на стіні" },
      { es: "Poste", uk: "Стовп" },
      { es: "Registro", uk: "Реєстр/Коробка" },
      { es: "Indicar el número de la planta > de metal, grande", uk: "Вказати номер поверху > металевий, великий" },
      { es: "Indicar el número de la planta > de madera", uk: "Вказати номер поверху > дерев'яний" },
      { es: "Indicar el número de la planta > en vertical", uk: "Вказати номер поверху > вертикальний" },
      { es: "Arqueta", uk: "Люк/Колодязь" },
      { es: "Riti", uk: "Ріті (щитова)" },
      { es: "Otros (introducir manualmente)", uk: "Інше (ввести вручну)" }
    ]
  },
  
  // Danos options
  danos: {
    label_es: "¿La CTO está con daños, visibles suciedades?",
    label_uk: "Чи має CTO видимі пошкодження або бруд?",
    options: [
      { es: "Le falta la tapa", uk: "Відсутня кришка" },
      { es: "Tiene cables rotos o dañados", uk: "Має обірвані або пошкоджені кабелі" },
      { es: "Tiene cables doblados", uk: "Має загнуті кабелі" },
      { es: "No se puede cerrar", uk: "Не закривається" },
      { es: "Está sucia y/o llena de agua", uk: "Брудна та/або заповнена водою" },
      { es: "Le faltan enfrentadores", uk: "Відсутні з'єднувачі/адаптери" },
      { es: "Tiene los divisores/splitter rotos", uk: "Має зламані дільники/спліттери" }
    ]
  },
  
  // Llaves options
  llaves: {
    label_es: "¿Se requieren llaves?",
    label_uk: "Чи потрібні ключі?",
    options: [
      { es: "Nombre del presidente/conserje", uk: "Ім'я голови/консьєржа" },
      { es: "Número de teléfono", uk: "Номер телефону" },
      { es: "No tengo ningún dato", uk: "Немає жодних даних" }
    ]
  },
  
  // Sincronismo Antala
  antala: {
    label_es: "¿Se requiere Levantamiento en Antala?",
    label_uk: "Чи потрібне внесення в Antala?",
    text_yes: "Se realiza sincronismo/levantamiento en Antala. Se realizan etiquetas de caja, cable y divisor.",
    text_failed: "No se ha podido realizar el sincronismo/levantamiento en Antala debido a que:"
  },

  // Area de influencia
  influencia: {
    label_es: "Área de influencia",
    label_uk: "Зона впливу",
    options: [
      { key: "porterillo", es: "Porterillo automático", uk: "Домофон", text: "Se adjunta foto del porterillo automático" },
      { key: "calle", es: "Calle", uk: "Вулиця" },
      { key: "otros", es: "Otros", uk: "Інше" }
    ]
  }
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "GESTOR")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const configSetting = await prisma.setting.findUnique({
      where: { key: "questionnaire_config" }
    });

    if (!configSetting) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    return NextResponse.json(JSON.parse(configSetting.value));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const config = await req.json();

    await prisma.setting.upsert({
      where: { key: "questionnaire_config" },
      update: { value: JSON.stringify(config) },
      create: { key: "questionnaire_config", value: JSON.stringify(config) }
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
