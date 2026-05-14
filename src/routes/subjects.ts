import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import express from 'express';
import { departments, subjects } from '../db/schema';
import { db } from '../db';

const router = express.Router();

// This route will get all subjects with optional search query, filtering, and pagination
router.get("/", async (req, res) => {
    try {
                const { search, department, page = "1", limit = "10" } = req.query
        const parsedPage = Number.parseInt(String(page), 10)
        const parsedLimit = Number.parseInt(String(limit), 10)
        const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
        const limitPerPage = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10
        const offset = (currentPage - 1) * limitPerPage

        const filterConditions = []

        // If search query exists, filter subjects by name or code 
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            )
        }

        // If department filter exists, match department name
        if (department) {
            filterConditions.push(
                or(
                    ilike(departments.name, `%${department}%`),
                )
            )
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)

        const totalCount = countResult[0]?.count ?? 0

        const subjectsList = await db
            .select({
                ...getTableColumns(subjects),
                department: { ...getTableColumns(departments) }
            })
            .from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset)

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }

        })
    } catch (e) {
        console.error(`GET /subjects error ${e}`)
        res.status(500).json({ error: "Failed to get subjects" })
    }
})

export default router