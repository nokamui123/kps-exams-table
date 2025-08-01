"use server";
import { Auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { collectAndSaveMyCourse } from "@/controllers/collectAndSaveMyCourse.controller";
import { revalidatePath } from "next/cache";
import { envServer } from "@/env/server.mjs";

export async function action() {
  try {
    const isAuth = await Auth();
    if (!isAuth)
      return {
        message: "โปรดเข้าสู่ระบบ",
        code: "UNAUTHRORIZED",
        disabled: false,
      };

    const {
      studentInfo: { stdCode },
      accesstoken,
    } = isAuth.user;
    const lastRequest = await prisma.requestUpdate.findFirst({
      where: { stdCode },
      orderBy: { createdAt: "desc" },
    });

    if (
      envServer.NODE_ENV === "production" &&
      lastRequest &&
      lastRequest.createdAt
    ) {
      const now = Date.now();
      const lastTime = new Date(lastRequest.createdAt).getTime();

      const diff = now - lastTime;
      const fiveMinute = 5 * 60 * 1000;

      if (diff < fiveMinute) {
        const timeLeftMs = fiveMinute - diff;
        const minutesLeft = Math.floor(timeLeftMs / 60000);
        const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);

        return {
          message: `ลองใหม่อีกครั้งใน ${minutesLeft}.${secondsLeft} นาที`,
          disabled: true,
          code: "TOO_EARLY",
        };
      }
    }
    await collectAndSaveMyCourse(stdCode, accesstoken);
    await prisma.$transaction(async (tx) => {
      const res = await tx.requestUpdate.create({ data: { stdCode } });
      await tx.user.update({
        where: { stdCode },
        data: { requestUpdateAt: res.createdAt }, // กำหนดค่าวันเวลาตรงนี้
      });
    });
    revalidatePath("/exams");
    return { message: "ดำเนินการเรียบร้อย", code: "SUCCESS", disabled: true };
  } catch (error) {
    console.error(error);
    return {
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      code: "INTERNAL_SERVER_ERROR",
    };
  }
}
