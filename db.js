import {
    db,
    doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, onSnapshot, query, where, orderBy
} from "./firebase-config.js";

export const DBService = {
    // Courses
    async getCourses() {
        const querySnapshot = await getDocs(collection(db, "courses"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getCourse(courseId) {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        return courseDoc.exists() ? { id: courseDoc.id, ...courseDoc.data() } : null;
    },

    async getCourseBySlug(slug) {
        const q = query(collection(db, "courses"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    },

    async createCourse(courseData) {
        const docRef = await addDoc(collection(db, "courses"), {
            ...courseData,
            sections: courseData.sections || []
        });
        return docRef.id;
    },

    async updateCourse(courseId, data) {
        await updateDoc(doc(db, "courses", courseId), data);
    },

    // Sections
    async addSection(courseId, sectionData) {
        const course = await this.getCourse(courseId);
        const sections = course.sections || [];
        sections.push({
            ...sectionData,
            sectionId: Date.now().toString()
        });
        await updateDoc(doc(db, "courses", courseId), { sections });
    },

    // Progress
    async updateProgress(userId, courseId, sectionId) {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        const progress = userData.progress || {};
        const courseProgress = progress[courseId] || { completedSections: [] };

        if (!courseProgress.completedSections.includes(sectionId)) {
            courseProgress.completedSections.push(sectionId);
        }

        progress[courseId] = courseProgress;
        await updateDoc(userRef, { progress });
    },

    async saveScrollPosition(userId, courseId, scrollY) {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        const progress = userData.progress || {};
        const courseProgress = progress[courseId] || { completedSections: [] };

        courseProgress.scrollPosition = scrollY;
        progress[courseId] = courseProgress;

        await updateDoc(userRef, { progress });
    },

    // Admin stuff
    async getAllUsers() {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // imgBB Image Upload
    async uploadImage(file) {
        const apiKey = "153cd0efa69f265d29c89961e1b962e8";
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            return result.data.url;
        } else {
            throw new Error("Image upload failed");
        }
    }
};
