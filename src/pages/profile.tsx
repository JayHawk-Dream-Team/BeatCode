import { auth, firestore } from "@/firebase/firebase";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Topbar from "@/components/Topbar/Topbar";
import useHasMounted from "@/hooks/useHasMounted";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "react-toastify";
import Link from "next/link";

type ProfileFormState = {
	handle: string;
	email: string;
	bio: string;
	photoURL: string;
	proficiencyModules: string[];
};

const EMPTY_PROFILE_STATE: ProfileFormState = {
	handle: "",
	email: "",
	bio: "",
	photoURL: "",
	proficiencyModules: [],
};

const ProfilePage = () => {
	const router = useRouter();
	const [user, loading] = useAuthState(auth);
	const hasMounted = useHasMounted();
	const [profile, setProfile] = useState<ProfileFormState>(EMPTY_PROFILE_STATE);
	const [savedProfile, setSavedProfile] = useState<ProfileFormState | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [newModule, setNewModule] = useState("");

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/auth");
		}
	}, [loading, user, router]);

	useEffect(() => {
		const loadProfile = async () => {
			if (!user) return;
			try {
				const userRef = doc(firestore, "users", user.uid);
				const userSnap = await getDoc(userRef);
				const initialProfile: ProfileFormState = {
					handle: user.displayName || "",
					email: user.email || "",
					bio: "",
					photoURL: user.photoURL || "",
					proficiencyModules: [],
				};

				if (userSnap.exists()) {
					const data = userSnap.data();
					initialProfile.handle = typeof data.displayName === "string" ? data.displayName : initialProfile.handle;
					initialProfile.email = typeof data.email === "string" ? data.email : initialProfile.email;
					initialProfile.bio = typeof data.bio === "string" ? data.bio : initialProfile.bio;
					initialProfile.photoURL = typeof data.photoURL === "string" ? data.photoURL : initialProfile.photoURL;
					initialProfile.proficiencyModules = Array.isArray(data.proficiencyModules)
						? data.proficiencyModules.filter((module) => typeof module === "string")
						: [];
				}

				setProfile(initialProfile);
				setSavedProfile(initialProfile);
			} catch (error) {
				console.error(error);
				toast.error("Unable to load profile data.", { position: "top-center" });
			}
		};

		loadProfile();
	}, [user]);

	const hasChanges = useMemo(() => {
		return !!savedProfile && JSON.stringify(savedProfile) !== JSON.stringify(profile);
	}, [savedProfile, profile]);

	const handleFieldChange = (field: keyof ProfileFormState, value: string) => {
		setProfile((prev) => ({ ...prev, [field]: value }));
	};

	const handleAddModule = () => {
		const trimmed = newModule.trim();
		if (!trimmed) return;
		const normalized = trimmed.toUpperCase().replace(/\s+/g, "_");
		if (profile.proficiencyModules.includes(normalized)) {
			toast.info("Module already added.", { position: "top-center" });
			return;
		}
		setProfile((prev) => ({
			...prev,
			proficiencyModules: [...prev.proficiencyModules, normalized],
		}));
		setNewModule("");
	};

	const handleRemoveModule = (module: string) => {
		setProfile((prev) => ({
			...prev,
			proficiencyModules: prev.proficiencyModules.filter((item) => item !== module),
		}));
	};

    // Upload PROFILE IMAGE - FIREBASE STORAGE REQUIRES A PAID PLAN FOR THIS FEATURE, SO THIS IS COMMENTED OUT FOR NOW. 
    // WHEN ENABLED, IT ALLOWS USERS TO UPLOAD A CUSTOM AVATAR WHICH IS THEN STORED IN FIREBASE STORAGE AND THE URL SAVED IN FIRESTORE.
	// const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
	// 	const file = event.target.files?.[0];
	// 	if (!file) return;
	// 	if (!file.type.startsWith("image/")) {
	// 		toast.error("Please upload an image file.", { position: "top-center" });
	// 		return;
	// 	}
    //     if (file.size > 2 * 1024 * 1024) {
    //         toast.error("File size exceeds 2MB limit.", { position: "top-center" });
    //         return;
    //     }
	// 	try {
    //         toast.loading("Uploading image...", { position: "top-center", toastId: "uploadToast" });
    //         const storage = getStorage();
    //         const storage_ref = ref(storage, `profile_pictures/${user!.uid}/${file.name}`);
    //         await uploadBytes(storage_ref, file);
    //         const url = await getDownloadURL(storage_ref);
    //         setProfile((prev) => ({ ...prev, photoURL: url }));
    //         toast.dismiss("uploadToast");
    //         toast.success("Image uploaded.", { position: "top-center", autoClose: 2000 });
    //     } catch (error) {
    //         console.error(error);
    //         toast.dismiss("uploadToast");
    //         toast.error("Failed to upload image.", { position: "top-center" });
    //     }
	// };

	const handleSave = async () => {
		if (!user) return;
		setIsSaving(true);
		try {
			const userRef = doc(firestore, "users", user.uid);
			await setDoc(
				userRef,
				{
					displayName: profile.handle,
					email: profile.email,
					bio: profile.bio,
					photoURL: profile.photoURL,
					proficiencyModules: profile.proficiencyModules,
					updatedAt: Date.now(),
				},
				{ merge: true }
			);
			setSavedProfile(profile);
			toast.success("Profile updated successfully.", { position: "top-center" });
		} catch (error) {
            // console.log(error);
			console.error(error);
			toast.error("Failed to save profile.", { position: "top-center" });
		} finally {
			setIsSaving(false);
		}
	};

	const handleDiscard = () => {
		if (savedProfile) setProfile(savedProfile);
	};

	if (!hasMounted || loading || (!user && !router.isReady)) {
		return null;
	}

	return (
		<main className='min-h-screen bg-background text-on-surface'>
			<Topbar />
			<section className='pt-24 pb-32 px-8 max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12'>
				<aside className='space-y-12'>
					<div>
						<nav className='flex flex-col gap-2'>
							<Link className='flex items-center gap-4 px-4 py-3 bg-surface-container-low text-primary border-l-2 border-primary' href='/profile'>
								<span className='text-xs font-bold tracking-widest uppercase'>Profile</span>
							</Link>
							<Link className='flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low text-on-surface-variant' href='/progress'>
								<span className='text-xs font-bold tracking-widest uppercase'>Progress</span>
							</Link>
						</nav>
					</div>
				</aside>

				<section className='space-y-16'>
					<header>
						<h1 className='text-5xl font-black tracking-tighter uppercase mb-4 text-on-surface'>Update Profile</h1>
						<p className='text-on-surface-variant text-sm max-w-xl leading-relaxed'>Update your profile information and your tech stack.</p>
					</header>
					<div className='space-y-20'>
						<div className='flex flex-col lg:flex-row gap-12 items-start'>
							<div className='relative group'>
								<div className='w-48 h-48 bg-surface-container-low p-1 overflow-hidden rounded-sm'>
									{profile.photoURL ? (
										<img src={profile.photoURL} alt='Profile avatar' className='w-full h-full object-cover' />
									) : (
										<div className='w-full h-full flex items-center justify-center bg-surface-container-highest text-primary text-3xl'>
											<span>?</span>
										</div>
									)}
								</div>
                                <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-sm cursor-pointer'></div>
							</div>
							<div className='flex-1 space-y-4'>
								<h2 className='text-xl font-bold tracking-tighter uppercase text-on-surface'>Operator Visuals</h2>
								<p className='text-xs text-on-surface-variant leading-relaxed max-w-sm uppercase tracking-wider'>Recommended: 1024x1024px. Supported formats: WEBP, PNG. Max weight: 2MB.</p>
								<div className='flex gap-4 pt-2'>
									<label className='px-6 py-2 bg-surface-container-highest text-primary text-[10px] font-bold tracking-widest uppercase hover:bg-surface-bright transition-colors cursor-pointer'>
										Upload New
										{/* <input type='file' accept='image/*' className='hidden' onChange={handlePhotoChange} /> */}
									</label>
									{/* <button className='px-6 py-2 text-on-surface-variant text-[10px] font-bold tracking-widest uppercase hover:text-error transition-colors' onClick={() => setProfile((prev) => ({ ...prev, photoURL: "" }))}>
									Deactivate
									</button> */}
								</div>
							</div>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10'>
							<div className='space-y-3'>
								<label className='text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase'>Operator Handle</label>
								<input
									value={profile.handle}
									onChange={(e) => handleFieldChange("handle", e.target.value)}
									className='w-full bg-surface-container-low border-none focus:ring-1 focus:ring-primary/40 text-on-surface font-mono text-sm py-4 px-5 rounded-sm uppercase tracking-widest'
									type='text'
								/>
							</div>
							<div className='space-y-3'>
								<label className='text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase'>Command Email</label>
								<input
									value={profile.email}
									onChange={(e) => handleFieldChange("email", e.target.value)}
									className='w-full bg-surface-container-low border-none focus:ring-1 focus:ring-primary/40 text-on-surface font-mono text-sm py-4 px-5 rounded-sm uppercase tracking-widest'
									type='email'
								/>
							</div>
							<div className='md:col-span-2 space-y-3'>
								<label className='text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase'>Mission Briefing (Bio)</label>
								<textarea
									value={profile.bio}
									onChange={(e) => handleFieldChange("bio", e.target.value)}
									className='w-full bg-surface-container-low border-none focus:ring-1 focus:ring-primary/40 text-on-surface text-sm py-4 px-5 rounded-sm leading-relaxed'
									rows={4}
								/>
							</div>
						</div>

						<div className='space-y-8'>
							<div className='flex flex-col md:flex-row justify-between items-end border-b border-outline-variant/10 pb-4 gap-4'>
								<h2 className='text-xl font-bold tracking-tighter uppercase text-on-surface'>Proficiency Stack</h2>
								<div className='flex items-center gap-2'>
									<input
										value={newModule}
										onChange={(e) => setNewModule(e.target.value)}
										placeholder='New module'
										className='bg-surface-container-low border-none text-on-surface text-xs py-3 px-4 rounded-sm w-full md:w-auto'
									/>
									<button
										onClick={handleAddModule}
										type='button'
										className='text-[10px] font-bold tracking-widest text-primary uppercase hover:underline'>
										Add Module
									</button>
								</div>
							</div>
							<div className='flex flex-wrap gap-3'>
								{profile.proficiencyModules.length === 0 ? (
									<div className='text-xs text-on-surface-variant uppercase tracking-widest'>No modules selected.</div>
								) : (
									profile.proficiencyModules.map((module) => (
										<div key={module} className='bg-surface-container-highest px-4 py-2 flex items-center gap-3 rounded-sm'>
											<span className='text-[10px] font-bold tracking-widest text-tertiary uppercase'>{module}</span>
											<button className='material-symbols-outlined text-xs text-on-surface-variant hover:text-error' type='button' onClick={() => handleRemoveModule(module)}>
												close
											</button>
										</div>
									))
								)}
							</div>
						</div>

						<div className='pt-12 flex justify-end gap-6 items-center'>
							<button
								type='button'
								onClick={handleDiscard}
								className='text-xs font-bold tracking-widest text-on-surface-variant uppercase hover:text-on-surface transition-colors'>
								Discard Alterations
							</button>
							<button
								type='button'
								onClick={handleSave}
								disabled={!hasChanges || isSaving}
								className='kinetic-gradient text-on-primary-fixed px-10 py-4 font-black tracking-[0.2em] uppercase text-xs active:scale-95 transition-transform shadow-[0_24px_48px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed'>
								{isSaving ? "Saving..." : "Commit Changes"}
							</button>
						</div>
					</div>
				</section>
			</section>
		</main>
	);
};

export default ProfilePage;
