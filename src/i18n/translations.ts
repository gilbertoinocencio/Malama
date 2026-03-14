// i18n/translations.ts
// All translations for NURA app - PT-BR, EN, ES

export type Language = 'en' | 'pt' | 'es';

export interface Translations {
    // Common
    app: {
        name: string;
        slogan: string;
    };

    // Navigation
    nav: {
        home: string;
        nutri: string;
        log: string;
        data: string;
        profile: string;
    };

    // Dashboard
    dashboard: {
        welcomeBack: string;
        keepTheFlow: string;
        fuelingPotential: string;
        kcal: string;
        protein: string;
        carbs: string;
        fats: string;
        logMeal: string;
        shareMyDay: string;
        levelSeed: string;
        levelRoot: string;
        levelStem: string;
        levelFlower: string;
        levelFruit: string;
        consistencyHigh: string;
        consistencyMedium: string;
        consistencyLow: string;
        defaultUser: string;
        levelPrefix: string;
    };

    // Flow Score Dashboard
    flowScore: {
        flowScore: string;
        optimized: string;
        day: string;
        week: string;
        month: string;
        insightText: string;
        weeklyRhythm: string;
        consistency: string;
        steady: string;
        metrics: string;
        viewAll: string;
        hydration: string;
        energy: string;
    };

    // Food Guide
    foodGuide: {
        title: string;
        subtitle: string;
        heroTitle: string;
        heroSubtitle: string;
        economic: string;
        balanced: string;
        premium: string;
        weeklyBudget: string;
        filteredByAi: string;
        proteins: string;
        carbohydrates: string;
        fatsLabel: string;
        aiInsightLabel: string;
        aiInsightText: string;
        insightEconomic: string;
        insightBalanced: string;
        currentMeal: string;
        completed: string;
        complexCarbs: string;
        goodFats: string;
        proteinGoal: string;
        swap: string;
        per100g: string;
        noFoods: string;
        logThis: string;
    };

    // MealLogger
    mealLogger: {
        title: string;
        online: string;
        today: string;
        describeMeal: string;
        addDetails: string;
        speakMeal: string;
        listening: string;
        analyzing: string;
        summary: string;
        kcalTotal: string;
        confirm: string;
        edit: string;
        cancel: string;
        you: string;
        connectionError: string;
        voiceNotSupported: string;
        analysisIntro: string;
        errorLogging: string;
    };

    // Profile
    profile: {
        title: string;
        settings: string;
        myGoals: string;
        integrations: string;
        quarterlyAnalysis: string;
        language: string;
        darkMode: string;
        notifications: string;
        about: string;
        logout: string;
        goals: {
            aesthetic: string;
            health: string;
            performance: string;
        };
        flowStatus: string;
        last3Months: string;
        flowDays: string;
        meals: string;
        consistency: string;
        low: string;
        high: string;
        recentAchievements: string;
        defineProfile: string;
        signOut: string;
    };

    // Quarterly Plan
    quarterlyPlan: {
        feedTheFlow: string;
        title: string;
        yourPlan: string;
        planDescription: string;
        generateNow: string;
        generating: string;
        dailyKcal: string;
        protein: string;
        carbs: string;
        fats: string;
        journey3Months: string;
        activatePlan: string;
        startNow: string;
        planActive: string;
        viewProgress: string;
        // Share
        myFlow: string;
        summaryOf: string;
        flowConsistency: string;
        days: string;
        flow: string;
        streak: string;
        dailyAvg: string;
        quarterlyGoal: string;
        onTrack: string;
        shareProgress: string;
        noData: string;
    };

    // Quarterly Analysis
    quarterlyAnalysis: {
        title: string;
        daysOfFlow: string;
        bodyEvolution: string;
        viewPhotos: string;
        consistencyPercent: string;
        macrosHit: string;
        evolutionBadge: string;
        unlockedOn: string;
        aiInsights: string;
        newPlanCta: string;
    };

    // Social
    social: {
        shareProgress: string;
        download: string;
        copyLink: string;
        close: string;
        community: string;
        myFlow: string;
        feedTitle: string;
        noPosts: string;
        postNow: string;
    };

    // Hydration
    hydration: {
        title: string;
        trackFlow: string;
        shareGoal: string;
        todayGoal: string;
        viewOptions: string;
        templateStyle: string;
        viewAll: string;
        goal: string;
        quote: string;
        shareGoalCta: string;
    };

    // Journal
    journal: {
        title: string;
        myFlow: string;
        flowStatus: string;
        inProgress: string;
        keepLogging: string;
        energyOfDay: string;
        low: string;
        medium: string;
        good: string;
        flow: string;
        visualRecord: string;
        captureFlow: string;
        captureFlowSub: string;
        notesOfDay: string;
        notesPlaceholder: string;
        shareToCommunity: string;
        saving: string;
        save: string;
        saveError: string;
        saveJournal: string;
    };

    // Profile Config
    profileConfig: {
        title: string;
        subtitle: string;
        bodyData: string;
        weight: string;
        height: string;
        age: string;
        gender: string;
        biotype: string;
        ectomorph: string;
        ectomorphDesc: string;
        mesomorph: string;
        mesomorphDesc: string;
        endomorph: string;
        endomorphDesc: string;
        mainGoal: string;
        aesthetic: string;
        health: string;
        performance: string;
        activityLevel: string;
        sedentary: string;
        moderate: string;
        intense: string;
        calculateMacros: string;
        saveError: string;
        welcome: string;
        setupProfile: string;
    };

    // Integrations
    integrations: {
        title: string;
        headline: string;
        subtitle: string;
        connected: string;
        pending: string;
        disconnected: string;
        securityNote: string;
    };

    // Plan Renewal
    planRenewal: {
        header: string;
        heroTitle: string;
        heroAccent: string;
        heroSubtitle: string;
        consistency: string;
        weeksCompleted: string;
        nextChapter: string;
        aesthetic: string;
        aestheticDesc: string;
        health: string;
        healthDesc: string;
        performance: string;
        performanceDesc: string;
        generatePlan: string;
    };

    // Refine Plan
    refinePlan: {
        title: string;
        adjustFlow: string;
        aiAnalysis: string;
        currentGoal: string;
        maintain: string;
        define: string;
        gain: string;
        workoutRoutine: string;
        weeklyFrequency: string;
        preferredTime: string;
        preferredTimeDesc: string;
        updateBiotype: string;
        currentWeight: string;
        bodyFat: string;
        planPreview: string;
        aiOptimized: string;
        dailyGoal: string;
        protein: string;
        carbs: string;
        fats: string;
        generatePlan90: string;
    };

    // Flow Adaptation
    flowAdaptation: {
        title: string;
        syncComplete: string;
        activityDetected: string;
        workoutType: string;
        duration: string;
        burned: string;
        details: string;
        kcalAdded: string;
        addedMessage: string;
        carbs: string;
        protein: string;
        fat: string;
    };

    // Auth
    auth: {
        subtitle: string;
        password: string;
        processing: string;
        signIn: string;
        signUp: string;
        fillFields: string;
        accountCreated: string;
        authError: string;
        hasAccount: string;
        noAccount: string;
        doLogin: string;
        createAccount: string;
        orContinueWith: string;
        continueGoogle: string;
        terms: string;
        aiNote: string;
    };

    // Macros
    macros: {
        prot: string;
        carb: string;
        fat: string;
    };

    // General
    general: {
        back: string;
        save: string;
        next: string;
        done: string;
        loading: string;
        error: string;
        success: string;
    };
}

export const translations: Record<Language, Translations> = {
    en: {
        app: {
            name: 'NURA',
            slogan: 'Feed the Flow',
        },
        nav: {
            home: 'Home',
            nutri: 'Nutri',
            log: 'Log',
            data: 'Data',
            profile: 'Profile',
        },
        dashboard: {
            welcomeBack: 'Welcome back',
            keepTheFlow: 'Keep the flow going.',
            fuelingPotential: 'You are fueling your potential one meal at a time.',
            kcal: 'kcal',
            protein: 'Protein',
            carbs: 'Carbs',
            fats: 'Fats',
            logMeal: 'Log Meal',
            shareMyDay: 'Share My Day',
            levelSeed: 'Seed',
            levelRoot: 'Root',
            levelStem: 'Stem',
            levelFlower: 'Flower',
            levelFruit: 'Fruit',
            consistencyHigh: 'High',
            consistencyMedium: 'Medium',
            consistencyLow: 'Low',
            defaultUser: 'User',
            levelPrefix: 'Level',
        },
        flowScore: {
            flowScore: 'Flow Score',
            optimized: 'Optimized',
            day: 'Day',
            week: 'Week',
            month: 'Month',
            insightText: 'Your consistency is up <b>+12%</b> this week. Peak flow achieved at 2 PM.',
            weeklyRhythm: 'Weekly Rhythm',
            consistency: 'Consistency',
            steady: 'Steady',
            metrics: 'Metrics',
            viewAll: 'View all',
            hydration: 'Hydration',
            energy: 'Energy',
        },
        foodGuide: {
            title: 'Food Guide',
            subtitle: 'Personalized suggestions for your energy.',
            heroTitle: 'Nutrition for\nyour Flow',
            heroSubtitle: 'Personalized suggestions for your energy.',
            economic: 'Economic',
            balanced: 'Balanced',
            premium: 'Premium',
            weeklyBudget: 'Weekly Budget',
            filteredByAi: 'Filtered by AI',
            proteins: 'Proteins',
            carbohydrates: 'Carbs',
            fatsLabel: 'Fats',
            aiInsightLabel: 'NURA AI Insight',
            aiInsightText: 'With the <b>Premium</b> profile active, we prioritize high bioavailability sources like wild salmon to optimize your cognition today.',
            insightEconomic: 'With <b>Economic</b> focus, we prioritize cost-effective high-protein sources: eggs, sardines, and rice with beans.',
            insightBalanced: 'With the <b>Balanced</b> profile, we combine cost-benefit with nutritional quality. Chicken, sweet potato, and avocado are your allies.',
            currentMeal: 'Current Meal',
            completed: 'Completed',
            complexCarbs: 'Complex',
            goodFats: 'Good',
            proteinGoal: 'Goal: 120g',
            swap: 'Swap',
            per100g: 'Per 100g',
            noFoods: 'No items found for this filter.',
            logThis: 'Log this food',
        },
        mealLogger: {
            title: 'NURA Assistant',
            online: 'Online',
            today: 'Today',
            describeMeal: 'Describe your meal...',
            addDetails: 'Add details...',
            speakMeal: 'Speak your meal...',
            listening: 'Listening...',
            analyzing: 'Analyzing your flow...',
            summary: 'Summary',
            kcalTotal: 'kcal total',
            confirm: 'Confirm',
            edit: 'Edit',
            cancel: 'Cancel',
            you: 'You',
            connectionError: "Having trouble connecting to the flow. Try again.",
            voiceNotSupported: 'Your browser does not support voice recognition. Use Chrome for better experience.',
            analysisIntro: 'Got it. Here is the nutritional analysis of your flow:',
            errorLogging: 'Error logging meal. Please try again.',
        },
        profile: {
            title: 'Profile',
            settings: 'Settings',
            myGoals: 'My Goals',
            integrations: 'Integrations',
            quarterlyAnalysis: 'Quarterly Analysis',
            language: 'Language',
            darkMode: 'Dark Mode',
            notifications: 'Notifications',
            about: 'About',
            logout: 'Logout',
            goals: {
                aesthetic: 'Aesthetic',
                health: 'Health',
                performance: 'Performance',
            },
            flowStatus: 'Flow Status',
            last3Months: 'Last 3 months',
            flowDays: 'Flow Days',
            meals: 'Meals',
            consistency: 'Consistency',
            low: 'Low',
            high: 'High',
            recentAchievements: 'Recent Achievements',
            defineProfile: 'Set up your profile',
            signOut: 'Sign Out',
        },
        quarterlyPlan: {
            feedTheFlow: 'Feed the Flow',
            title: 'AI Generated Plan',
            yourPlan: 'Your Personalized Plan',
            planDescription: 'NURA AI will analyze your profile, biotype, and goals to create a unique quarterly strategy.',
            generateNow: 'Generate Plan Now',
            generating: 'Generating Strategy...',
            dailyKcal: 'Daily Kcal',
            protein: 'Protein',
            carbs: 'Carbohydrates',
            fats: 'Fats',
            journey3Months: '3-Month Journey',
            activatePlan: 'Activate Quarterly Plan',
            startNow: 'Start Now',
            planActive: 'Plan Active',
            viewProgress: 'View Progress',
            myFlow: 'My NURA Flow',
            summaryOf: 'Summary of',
            flowConsistency: 'Flow Consistency',
            days: 'Days',
            flow: 'Flow',
            streak: 'Streak',
            dailyAvg: 'Daily Avg',
            quarterlyGoal: 'Quarterly Goal',
            onTrack: 'You are on track to reach your best version by the end of the quarter.',
            shareProgress: 'Share Progress',
            noData: 'No data yet',
        },
        quarterlyAnalysis: {
            title: 'Quarterly Analysis',
            daysOfFlow: 'Days of Flow',
            bodyEvolution: 'Body Evolution',
            viewPhotos: 'View Photos',
            consistencyPercent: 'Consistency %',
            macrosHit: 'Macros Hit',
            evolutionBadge: 'Evolution Badge',
            unlockedOn: 'Unlocked on',
            aiInsights: 'AI Insights',
            newPlanCta: 'New Plan for Next Quarter',
        },
        social: {
            shareProgress: 'Share Progress',
            download: 'Download',
            copyLink: 'Copy Link',
            close: 'Close',
            community: 'Community',
            myFlow: 'My Flow',
            feedTitle: 'Flow Feed',
            noPosts: 'No posts yet. Be the first to share your flow!',
            postNow: 'Post Now',
        },
        hydration: {
            title: 'Social Hydration',
            trackFlow: 'Track the Flow',
            shareGoal: 'Share your daily water goal',
            todayGoal: "Today's Goal",
            viewOptions: 'View Options',
            templateStyle: 'Template Style',
            viewAll: 'View all',
            goal: 'Goal',
            quote: 'Quote',
            shareGoalCta: 'Share Goal',
        },
        journal: {
            title: 'NURA Journal',
            myFlow: 'My Flow',
            flowStatus: 'Flow Status',
            inProgress: 'In Progress',
            keepLogging: 'Keep logging to calculate.',
            energyOfDay: 'Energy of the Day',
            low: 'Low',
            medium: 'Medium',
            good: 'Good',
            flow: 'Flow',
            visualRecord: 'Visual Record',
            captureFlow: 'Capture your Flow',
            captureFlowSub: 'Record the aesthetics of your nutrition today.',
            notesOfDay: 'Notes of the Day',
            notesPlaceholder: 'How did you fuel your flow today? Write briefly...',
            shareToCommunity: 'Share to Community Feed',
            saving: 'Saving...',
            save: 'Save',
            saveError: 'Error saving journal',
            saveJournal: 'Save Journal',
        },
        profileConfig: {
            title: 'Biometric Profile',
            subtitle: 'Feed the Flow. Personalize NURA intelligence for your metabolism.',
            bodyData: 'Body Data',
            weight: 'Weight (kg)',
            height: 'Height (cm)',
            age: 'Age',
            gender: 'Gender',
            biotype: 'Your Biotype',
            ectomorph: 'Ectomorph',
            ectomorphDesc: 'Light frame, fast metabolism.',
            mesomorph: 'Mesomorph',
            mesomorphDesc: 'Athletic, gains muscle easily.',
            endomorph: 'Endomorph',
            endomorphDesc: 'Broad frame, slow metabolism.',
            mainGoal: 'Main Goal',
            aesthetic: 'Aesthetic',
            health: 'Health',
            performance: 'Performance',
            activityLevel: 'Activity Level',
            sedentary: 'Sedentary',
            moderate: 'Moderate',
            intense: 'Intense',
            calculateMacros: 'Calculate Macros',
            saveError: 'Error saving profile. Please try again.',
            welcome: 'Welcome to Nura',
            setupProfile: 'Let\'s set up your profile to customize your experience.',
        },
        integrations: {
            title: 'Integrations',
            headline: 'Connect your <accent>ecosystem</accent> for a smarter Flow',
            subtitle: 'Centralize your health data to maximize results. NURA syncs in real-time to adapt your nutrition.',
            connected: 'Connected',
            pending: 'Sync pending',
            disconnected: 'Disconnected',
            securityNote: 'Encrypted data and secure sync',
        },
        auth: {
            subtitle: 'Nutrition for your Flow',
            password: 'Password',
            processing: 'Processing...',
            signIn: 'Sign In',
            signUp: 'Create Account',
            fillFields: 'Please fill in email and password',
            accountCreated: 'Account created! Check your email or try signing in.',
            authError: 'Authentication error',
            hasAccount: 'Already have an account?',
            noAccount: 'Don\'t have an account?',
            doLogin: 'Sign In',
            createAccount: 'Create new account',
            orContinueWith: 'Or continue with',
            continueGoogle: 'Continue with Google',
            terms: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
            aiNote: 'Nura uses AI to optimize your nutrition.',
        },
        planRenewal: {
            header: 'Plan Renewal',
            heroTitle: 'A new cycle',
            heroAccent: 'starts now.',
            heroSubtitle: 'Your consistency in the last quarter was inspiring. Let\'s recalibrate your Flow.',
            consistency: 'Consistency',
            weeksCompleted: 'Weeks Completed',
            nextChapter: 'What\'s the focus for the next chapter?',
            aesthetic: 'Aesthetic',
            aestheticDesc: 'Sculpt and define',
            health: 'Health',
            healthDesc: 'Longevity and balance',
            performance: 'Performance',
            performanceDesc: 'Power and endurance',
            generatePlan: 'Generate Personalized Plan',
        },
        refinePlan: {
            title: 'Refining the Flow',
            adjustFlow: 'Adjust your Flow',
            aiAnalysis: 'Our AI analyzed your last 90 days. The algorithm suggests a protein increase for the next cycle. Adjust to your preference.',
            currentGoal: 'Current Goal',
            maintain: 'Maintain',
            define: 'Define',
            gain: 'Gain',
            workoutRoutine: 'Workout Routine',
            weeklyFrequency: 'Weekly Frequency',
            preferredTime: 'Preferred Time',
            preferredTimeDesc: 'Adjusts carb timing',
            updateBiotype: 'Update Biotype',
            currentWeight: 'Current Weight',
            bodyFat: 'Body Fat',
            planPreview: 'Plan Preview',
            aiOptimized: 'AI OPTIMIZED',
            dailyGoal: 'Daily Goal',
            protein: 'Protein',
            carbs: 'Carbs',
            fats: 'Fat',
            generatePlan90: 'Generate Plan (90 Days)',
        },
        flowAdaptation: {
            title: 'Flow Adaptation',
            syncComplete: 'Sync Complete',
            activityDetected: 'Activity Detected',
            workoutType: 'Workout Type',
            duration: 'Duration',
            burned: 'burned',
            details: 'Details',
            kcalAdded: 'Kcal Added',
            addedMessage: 'We\'ve added <bold>+{kcal}kcal</bold> to your flow today based on your activity intensity.',
            carbs: 'Carbs',
            protein: 'Protein',
            fat: 'Fat',
        },
        macros: {
            prot: 'Prot',
            carb: 'Carb',
            fat: 'Fat',
        },
        general: {
            back: 'Back',
            save: 'Save',
            next: 'Next',
            done: 'Done',
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
        },
    },

    pt: {
        app: {
            name: 'NURA',
            slogan: 'Alimente o Flow',
        },
        nav: {
            home: 'Início',
            nutri: 'Nutri',
            log: 'Registrar',
            data: 'Dados',
            profile: 'Perfil',
        },
        dashboard: {
            welcomeBack: 'Bem-vindo de volta',
            keepTheFlow: 'Mantenha o flow.',
            fuelingPotential: 'Você está alimentando seu potencial uma refeição de cada vez.',
            kcal: 'kcal',
            protein: 'Proteína',
            carbs: 'Carboidratos',
            fats: 'Gorduras',
            logMeal: 'Registrar Refeição',
            shareMyDay: 'Compartilhar Meu Dia',
            levelSeed: 'Semente',
            levelRoot: 'Raiz',
            levelStem: 'Caule',
            levelFlower: 'Flor',
            levelFruit: 'Fruto',
            consistencyHigh: 'Alta',
            consistencyMedium: 'Média',
            consistencyLow: 'Baixa',
            defaultUser: 'Usuário',
            levelPrefix: 'Nível',
        },
        flowScore: {
            flowScore: 'Flow Score',
            optimized: 'Otimizado',
            day: 'Dia',
            week: 'Semana',
            month: 'Mês',
            insightText: 'Sua consistência aumentou <b>+12%</b> esta semana. Pico de flow às 14h.',
            weeklyRhythm: 'Ritmo Semanal',
            consistency: 'Consistência',
            steady: 'Estável',
            metrics: 'Métricas',
            viewAll: 'Ver tudo',
            hydration: 'Hidratação',
            energy: 'Energia',
        },
        foodGuide: {
            title: 'Guia de Alimentos',
            subtitle: 'Sugestões personalizadas para sua energia.',
            heroTitle: 'Nutrição para\\no seu Flow',
            heroSubtitle: 'Sugestões personalizadas para sua energia.',
            economic: 'Econômico',
            balanced: 'Equilibrado',
            premium: 'Premium',
            weeklyBudget: 'Budget Semanal',
            filteredByAi: 'Filtrado por IA',
            proteins: 'Proteínas',
            carbohydrates: 'Carboidratos',
            fatsLabel: 'Gorduras',
            aiInsightLabel: 'NURA AI Insight',
            aiInsightText: 'Com o perfil <b>Premium</b> ativo, priorizamos fontes de alta biodisponibilidade como salmão selvagem para otimizar sua cognição hoje.',
            insightEconomic: 'Com foco <b>Econômico</b>, priorizamos fontes de alta densidade proteica que cabem no bolso: ovos, sardinha e arroz com feijão.',
            insightBalanced: 'Com o perfil <b>Equilibrado</b>, combinamos custo-benefício com qualidade nutricional. Frango, batata doce e abacate são seus aliados.',
            currentMeal: 'Refeição Atual',
            completed: 'Concluído',
            complexCarbs: 'Complexos',
            goodFats: 'Boas',
            proteinGoal: 'Meta: 120g',
            swap: 'Trocar',
            per100g: 'Por 100g',
            noFoods: 'Nenhum item encontrado para este filtro.',
            logThis: 'Registrar este alimento',
        },
        mealLogger: {
            title: 'Assistente NURA',
            online: 'Online',
            today: 'Hoje',
            describeMeal: 'Descreva sua refeição...',
            addDetails: 'Adicione detalhes...',
            speakMeal: 'Fale sua refeição...',
            listening: 'Ouvindo...',
            analyzing: 'Analisando seu flow...',
            summary: 'Resumo',
            kcalTotal: 'kcal total',
            confirm: 'Confirmar',
            edit: 'Editar',
            cancel: 'Cancelar',
            you: 'Você',
            connectionError: 'Estou com dificuldade para conectar ao flow. Tente novamente.',
            voiceNotSupported: 'Seu navegador não suporta reconhecimento de voz. Use Chrome para melhor experiência.',
            analysisIntro: 'Entendido. Aqui está a análise nutricional do seu flow:',
            errorLogging: 'Erro ao registrar refeição. Tente novamente.',
        },
        profile: {
            title: 'Perfil',
            settings: 'Configurações',
            myGoals: 'Minhas Metas',
            integrations: 'Integrações',
            quarterlyAnalysis: 'Análise Trimestral',
            language: 'Idioma',
            darkMode: 'Modo Escuro',
            notifications: 'Notificações',
            about: 'Sobre',
            logout: 'Sair',
            goals: {
                aesthetic: 'Estética',
                health: 'Saúde',
                performance: 'Performance',
            },
            flowStatus: 'Status do Flow',
            last3Months: 'Últimos 3 meses',
            flowDays: 'Dias em Flow',
            meals: 'Refeições',
            consistency: 'Consistência',
            low: 'Baixo',
            high: 'Alto',
            recentAchievements: 'Conquistas Recentes',
            defineProfile: 'Defina seu perfil',
            signOut: 'Sair da Conta',
        },
        quarterlyPlan: {
            feedTheFlow: 'Feed the Flow',
            title: 'Plano Gerado IA',
            yourPlan: 'Seu Plano Personalizado',
            planDescription: 'A IA Nura analisará seu perfil, biotipo e objetivos para criar uma estratégia trimestral única.',
            generateNow: 'Gerar Plano Agora',
            generating: 'Gerando Estratégia...',
            dailyKcal: 'Kcal Diárias',
            protein: 'Proteína',
            carbs: 'Carboidratos',
            fats: 'Gorduras',
            journey3Months: 'Jornada de 3 Meses',
            activatePlan: 'Ativar Plano Trimestral',
            startNow: 'Começar Agora',
            planActive: 'Plano Ativo',
            viewProgress: 'Ver Progresso',
            myFlow: 'My NURA Flow',
            summaryOf: 'Resumo de',
            flowConsistency: 'Consistência do Flow',
            days: 'Dias',
            flow: 'Flow',
            streak: 'Streak',
            dailyAvg: 'Média Diária',
            quarterlyGoal: 'Meta Trimestral',
            onTrack: 'Você está no caminho certo para atingir sua melhor versão até o final do trimestre.',
            shareProgress: 'Compartilhar Progresso',
            noData: 'Sem dados ainda',
        },
        quarterlyAnalysis: {
            title: 'Análise Trimestral',
            daysOfFlow: 'Dias de Flow',
            bodyEvolution: 'Evolução Corporal',
            viewPhotos: 'Ver Fotos',
            consistencyPercent: '% de Consistência',
            macrosHit: 'Macros Atingidos',
            evolutionBadge: 'Badge de Evolução',
            unlockedOn: 'Desbloqueado em',
            aiInsights: 'Insights da IA',
            newPlanCta: 'Novo Plano para o Próximo Trimestre',
        },
        social: {
            shareProgress: 'Compartilhar Progresso',
            download: 'Baixar',
            copyLink: 'Copiar Link',
            close: 'Fechar',
            community: 'Comunidade',
            myFlow: 'Meu Flow',
            feedTitle: 'Feed do Flow',
            noPosts: 'Nenhum post ainda. Seja o primeiro a compartilhar seu flow!',
            postNow: 'Postar Agora',
        },
        hydration: {
            title: 'Hidratação Social',
            trackFlow: 'Acompanhe o Fluxo',
            shareGoal: 'Compartilhe sua meta diária de água',
            todayGoal: 'Meta de Hoje',
            viewOptions: 'Opções de visualização',
            templateStyle: 'Estilo do Template',
            viewAll: 'Ver todos',
            goal: 'Meta',
            quote: 'Frase',
            shareGoalCta: 'Compartilhar Meta',
        },
        journal: {
            title: 'Diário NURA',
            myFlow: 'Meu Flow',
            flowStatus: 'Flow Status',
            inProgress: 'Em Progresso',
            keepLogging: 'Continue registrando para calcular.',
            energyOfDay: 'Energia do Dia',
            low: 'Baixa',
            medium: 'Média',
            good: 'Boa',
            flow: 'Flow',
            visualRecord: 'Registro Visual',
            captureFlow: 'Capture seu Flow',
            captureFlowSub: 'Registre a estética da sua nutrição de hoje.',
            notesOfDay: 'Notas do Dia',
            notesPlaceholder: 'Como você alimentou seu flow hoje? Escreva brevemente...',
            shareToCommunity: 'Compartilhar no Feed da Comunidade',
            saving: 'Salvando...',
            save: 'Salvar',
            saveError: 'Erro ao salvar diário',
            saveJournal: 'Salvar Diário',
        },
        profileConfig: {
            title: 'Perfil Biométrico',
            subtitle: 'Feed the Flow. Personalize a inteligência da NURA para o seu metabolismo.',
            bodyData: 'Dados Corporais',
            weight: 'Peso (kg)',
            height: 'Altura (cm)',
            age: 'Idade',
            gender: 'Gênero',
            biotype: 'Seu Biotipo',
            ectomorph: 'Ectomorfo',
            ectomorphDesc: 'Estrutura leve, metabolismo acelerado.',
            mesomorph: 'Mesomorfo',
            mesomorphDesc: 'Atlético, ganha músculos facilmente.',
            endomorph: 'Endomorfo',
            endomorphDesc: 'Estrutura larga, metabolismo lento.',
            mainGoal: 'Objetivo Principal',
            aesthetic: 'Estética',
            health: 'Saúde',
            performance: 'Performance',
            activityLevel: 'Nível de Atividade',
            sedentary: 'Sedentário',
            moderate: 'Moderado',
            intense: 'Intenso',
            calculateMacros: 'Calcular Macros',
            saveError: 'Erro ao salvar perfil. Tente novamente.',
            welcome: 'Bem-vindo ao Nura',
            setupProfile: 'Vamos configurar seu perfil para personalizar sua experiência.',
        },
        integrations: {
            title: 'Integrações',
            headline: 'Conecte seu <accent>ecossistema</accent> para um Flow inteligente',
            subtitle: 'Centralize seus dados de saúde para maximizar seus resultados. O NURA sincroniza em tempo real para adaptar sua nutrição.',
            connected: 'Conectado',
            pending: 'Sincronização pendente',
            disconnected: 'Desconectado',
            securityNote: 'Dados criptografados e sincronização segura',
        },
        auth: {
            subtitle: 'Nutrição para o seu Flow',
            password: 'Senha',
            processing: 'Processando...',
            signIn: 'Entrar',
            signUp: 'Criar Conta',
            fillFields: 'Preencha email e senha',
            accountCreated: 'Conta criada! Verifique seu email ou tente entrar.',
            authError: 'Erro de autenticação',
            hasAccount: 'Já tem conta?',
            noAccount: 'Não tem conta?',
            doLogin: 'Fazer Login',
            createAccount: 'Criar nova conta',
            orContinueWith: 'Ou continue com',
            continueGoogle: 'Continuar com Google',
            terms: 'Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.',
            aiNote: 'Nura usa IA para otimizar sua nutrição.',
        },
        planRenewal: {
            header: 'Renovação de Plano',
            heroTitle: 'Um novo ciclo',
            heroAccent: 'começa agora.',
            heroSubtitle: 'Sua consistência no último trimestre foi inspiradora. Vamos recalibrar seu Flow.',
            consistency: 'Consistência',
            weeksCompleted: 'Semanas Concluídas',
            nextChapter: 'Qual é o foco para o próximo capítulo?',
            aesthetic: 'Estética',
            aestheticDesc: 'Esculpir e definir',
            health: 'Saúde',
            healthDesc: 'Longevidade e equilíbrio',
            performance: 'Performance',
            performanceDesc: 'Potência e resistência',
            generatePlan: 'Gerar Plano Personalizado',
        },
        refinePlan: {
            title: 'Refinando o Flow',
            adjustFlow: 'Ajuste seu Flow',
            aiAnalysis: 'Nossa IA analisou seus últimos 90 dias. O algoritmo sugere um aumento de proteína para o próximo ciclo. Ajuste conforme sua preferência.',
            currentGoal: 'Objetivo Atual',
            maintain: 'Manter',
            define: 'Definir',
            gain: 'Ganhar',
            workoutRoutine: 'Rotina de Treinos',
            weeklyFrequency: 'Frequência Semanal',
            preferredTime: 'Horário Preferido',
            preferredTimeDesc: 'Ajusta o timing dos carboidratos',
            updateBiotype: 'Atualizar Biotipo',
            currentWeight: 'Peso Atual',
            bodyFat: 'Gordura Corporal',
            planPreview: 'Preview do Plano',
            aiOptimized: 'IA OTIMIZADA',
            dailyGoal: 'Meta Diária',
            protein: 'Proteína',
            carbs: 'Carbo',
            fats: 'Gordura',
            generatePlan90: 'Gerar Plano (90 Dias)',
        },
        flowAdaptation: {
            title: 'Flow Adaptation',
            syncComplete: 'Sincronização Completa',
            activityDetected: 'Atividade Detectada',
            workoutType: 'Tipo de Treino',
            duration: 'Duração',
            burned: 'queimados',
            details: 'Detalhes',
            kcalAdded: 'Kcal Adicionados',
            addedMessage: 'Adicionamos <bold>+{kcal}kcal</bold> ao seu flow hoje com base na intensidade da atividade.',
            carbs: 'Carbo',
            protein: 'Proteína',
            fat: 'Gordura',
        },
        macros: {
            prot: 'Prot',
            carb: 'Carb',
            fat: 'Gord',
        },
        general: {
            back: 'Voltar',
            save: 'Salvar',
            next: 'Próximo',
            done: 'Concluído',
            loading: 'Carregando...',
            error: 'Erro',
            success: 'Sucesso',
        },
    },

    es: {
        app: {
            name: 'NURA',
            slogan: 'Alimenta el Flow',
        },
        nav: {
            home: 'Inicio',
            nutri: 'Nutri',
            log: 'Registrar',
            data: 'Datos',
            profile: 'Perfil',
        },
        dashboard: {
            welcomeBack: 'Bienvenido de nuevo',
            keepTheFlow: 'Mantén el flow.',
            fuelingPotential: 'Estás alimentando tu potencial una comida a la vez.',
            kcal: 'kcal',
            protein: 'Proteína',
            carbs: 'Carbohidratos',
            fats: 'Grasas',
            logMeal: 'Registrar Comida',
            shareMyDay: 'Compartir Mi Día',
            levelSeed: 'Semilla',
            levelRoot: 'Raíz',
            levelStem: 'Tallo',
            levelFlower: 'Flor',
            levelFruit: 'Fruto',
            consistencyHigh: 'Alta',
            consistencyMedium: 'Media',
            consistencyLow: 'Baja',
            defaultUser: 'Usuario',
            levelPrefix: 'Nivel',
        },
        flowScore: {
            flowScore: 'Flow Score',
            optimized: 'Optimizado',
            day: 'Día',
            week: 'Semana',
            month: 'Mes',
            insightText: 'Tu consistencia subió <b>+12%</b> esta semana. Pico de flow a las 2 PM.',
            weeklyRhythm: 'Ritmo Semanal',
            consistency: 'Consistencia',
            steady: 'Estable',
            metrics: 'Métricas',
            viewAll: 'Ver todo',
            hydration: 'Hidratación',
            energy: 'Energía',
        },
        foodGuide: {
            title: 'Guía de Alimentos',
            subtitle: 'Sugerencias personalizadas para tu energía.',
            heroTitle: 'Nutrición para\\ntu Flow',
            heroSubtitle: 'Sugerencias personalizadas para tu energía.',
            economic: 'Económico',
            balanced: 'Equilibrado',
            premium: 'Premium',
            weeklyBudget: 'Budget Semanal',
            filteredByAi: 'Filtrado por IA',
            proteins: 'Proteínas',
            carbohydrates: 'Carbohidratos',
            fatsLabel: 'Grasas',
            aiInsightLabel: 'NURA AI Insight',
            aiInsightText: 'Con el perfil <b>Premium</b> activo, priorizamos fuentes de alta biodisponibilidad como salmón salvaje para optimizar tu cognición hoy.',
            insightEconomic: 'Con enfoque <b>Económico</b>, priorizamos fuentes de alta densidad proteica accesibles: huevos, sardinas y arroz con frijoles.',
            insightBalanced: 'Con el perfil <b>Equilibrado</b>, combinamos costo-beneficio con calidad nutricional. Pollo, batata y aguacate son tus aliados.',
            currentMeal: 'Comida Actual',
            completed: 'Completado',
            complexCarbs: 'Complejos',
            goodFats: 'Buenas',
            proteinGoal: 'Meta: 120g',
            swap: 'Intercambiar',
            per100g: 'Por 100g',
            noFoods: 'No se encontraron items para este filtro.',
            logThis: 'Registrar este alimento',
        },
        mealLogger: {
            title: 'Asistente NURA',
            online: 'En línea',
            today: 'Hoy',
            describeMeal: 'Describe tu comida...',
            addDetails: 'Agrega detalles...',
            speakMeal: 'Habla tu comida...',
            listening: 'Escuchando...',
            analyzing: 'Analizando tu flow...',
            summary: 'Resumen',
            kcalTotal: 'kcal total',
            confirm: 'Confirmar',
            edit: 'Editar',
            cancel: 'Cancelar',
            you: 'Tú',
            connectionError: 'Tengo dificultades para conectar al flow. Intenta de nuevo.',
            voiceNotSupported: 'Tu navegador no soporta reconocimiento de voz. Usa Chrome para mejor experiencia.',
            analysisIntro: 'Entendido. Aquí está el análisis nutricional de tu flow:',
            errorLogging: 'Error al registrar comida. Intenta de nuevo.',
        },
        profile: {
            title: 'Perfil',
            settings: 'Configuración',
            myGoals: 'Mis Metas',
            integrations: 'Integraciones',
            quarterlyAnalysis: 'Análisis Trimestral',
            language: 'Idioma',
            darkMode: 'Modo Oscuro',
            notifications: 'Notificaciones',
            about: 'Acerca de',
            logout: 'Cerrar Sesión',
            goals: {
                aesthetic: 'Estética',
                health: 'Salud',
                performance: 'Rendimiento',
            },
            flowStatus: 'Estado del Flow',
            last3Months: 'Últimos 3 meses',
            flowDays: 'Días en Flow',
            meals: 'Comidas',
            consistency: 'Consistencia',
            low: 'Bajo',
            high: 'Alto',
            recentAchievements: 'Logros Recientes',
            defineProfile: 'Configura tu perfil',
            signOut: 'Cerrar Sesión',
        },
        quarterlyPlan: {
            feedTheFlow: 'Feed the Flow',
            title: 'Plan Generado IA',
            yourPlan: 'Tu Plan Personalizado',
            planDescription: 'La IA Nura analizará tu perfil, biotipo y objetivos para crear una estrategia trimestral única.',
            generateNow: 'Generar Plan Ahora',
            generating: 'Generando Estrategia...',
            dailyKcal: 'Kcal Diarias',
            protein: 'Proteína',
            carbs: 'Carbohidratos',
            fats: 'Grasas',
            journey3Months: 'Jornada de 3 Meses',
            activatePlan: 'Activar Plan Trimestral',
            startNow: 'Comenzar Ahora',
            planActive: 'Plan Activo',
            viewProgress: 'Ver Progreso',
            myFlow: 'My NURA Flow',
            summaryOf: 'Resumen de',
            flowConsistency: 'Consistencia del Flow',
            days: 'Días',
            flow: 'Flow',
            streak: 'Racha',
            dailyAvg: 'Promedio Diario',
            quarterlyGoal: 'Meta Trimestral',
            onTrack: 'Estás en el camino correcto para alcanzar tu mejor versión al final del trimestre.',
            shareProgress: 'Compartir Progreso',
            noData: 'Sin datos aún',
        },
        quarterlyAnalysis: {
            title: 'Análisis Trimestral',
            daysOfFlow: 'Días de Flow',
            bodyEvolution: 'Evolución Corporal',
            viewPhotos: 'Ver Fotos',
            consistencyPercent: '% de Consistencia',
            macrosHit: 'Macros Alcanzados',
            evolutionBadge: 'Insignia de Evolución',
            unlockedOn: 'Desbloqueado el',
            aiInsights: 'Insights de IA',
            newPlanCta: 'Nuevo Plan para el Próximo Trimestre',
        },
        social: {
            shareProgress: 'Compartir Progreso',
            download: 'Descargar',
            copyLink: 'Copiar Enlace',
            close: 'Cerrar',
            community: 'Comunidad',
            myFlow: 'Mi Flow',
            feedTitle: 'Feed del Flow',
            noPosts: 'Aún no hay posts. ¡Sé el primero en compartir tu flow!',
            postNow: 'Publicar Ahora',
        },
        hydration: {
            title: 'Hidratación Social',
            trackFlow: 'Sigue el Flujo',
            shareGoal: 'Comparte tu meta diaria de agua',
            todayGoal: 'Meta de Hoy',
            viewOptions: 'Opciones de vista',
            templateStyle: 'Estilo de Plantilla',
            viewAll: 'Ver todo',
            goal: 'Meta',
            quote: 'Frase',
            shareGoalCta: 'Compartir Meta',
        },
        journal: {
            title: 'Diario NURA',
            myFlow: 'Mi Flow',
            flowStatus: 'Estado del Flow',
            inProgress: 'En Progreso',
            keepLogging: 'Sigue registrando para calcular.',
            energyOfDay: 'Energía del Día',
            low: 'Baja',
            medium: 'Media',
            good: 'Buena',
            flow: 'Flow',
            visualRecord: 'Registro Visual',
            captureFlow: 'Captura tu Flow',
            captureFlowSub: 'Registra la estética de tu nutrición hoy.',
            notesOfDay: 'Notas del Día',
            notesPlaceholder: '¿Cómo alimentaste tu flow hoy? Escribe brevemente...',
            shareToCommunity: 'Compartir en el Feed de la Comunidad',
            saving: 'Guardando...',
            save: 'Guardar',
            saveError: 'Error al guardar diario',
            saveJournal: 'Guardar Diario',
        },
        profileConfig: {
            title: 'Perfil Biométrico',
            subtitle: 'Feed the Flow. Personaliza la inteligencia de NURA para tu metabolismo.',
            bodyData: 'Datos Corporales',
            weight: 'Peso (kg)',
            height: 'Altura (cm)',
            age: 'Edad',
            gender: 'Género',
            biotype: 'Tu Biotipo',
            ectomorph: 'Ectomorfo',
            ectomorphDesc: 'Estructura ligera, metabolismo rápido.',
            mesomorph: 'Mesomorfo',
            mesomorphDesc: 'Atlético, gana músculo fácilmente.',
            endomorph: 'Endomorfo',
            endomorphDesc: 'Estructura ancha, metabolismo lento.',
            mainGoal: 'Objetivo Principal',
            aesthetic: 'Estética',
            health: 'Salud',
            performance: 'Rendimiento',
            activityLevel: 'Nivel de Actividad',
            sedentary: 'Sedentario',
            moderate: 'Moderado',
            intense: 'Intenso',
            calculateMacros: 'Calcular Macros',
            saveError: 'Error al guardar perfil. Inténtalo de nuevo.',
            welcome: 'Bienvenido a Nura',
            setupProfile: 'Vamos a configurar tu perfil para personalizar tu experiencia.',
        },
        integrations: {
            title: 'Integraciones',
            headline: 'Conecta tu <accent>ecosistema</accent> para un Flow inteligente',
            subtitle: 'Centraliza tus datos de salud para maximizar resultados. NURA sincroniza en tiempo real para adaptar tu nutrición.',
            connected: 'Conectado',
            pending: 'Sincronización pendiente',
            disconnected: 'Desconectado',
            securityNote: 'Datos encriptados y sincronización segura',
        },
        auth: {
            subtitle: 'Nutrici\u00f3n para tu Flow',
            password: 'Contrase\u00f1a',
            processing: 'Procesando...',
            signIn: 'Iniciar Sesi\u00f3n',
            signUp: 'Crear Cuenta',
            fillFields: 'Completa email y contrase\u00f1a',
            accountCreated: '\u00a1Cuenta creada! Verifica tu email o intenta iniciar sesi\u00f3n.',
            authError: 'Error de autenticaci\u00f3n',
            hasAccount: '\u00bfYa tienes cuenta?',
            noAccount: '\u00bfNo tienes cuenta?',
            doLogin: 'Iniciar Sesi\u00f3n',
            createAccount: 'Crear nueva cuenta',
            orContinueWith: 'O contin\u00faa con',
            continueGoogle: 'Continuar con Google',
            terms: 'Al continuar, aceptas nuestros T\u00e9rminos de Servicio y Pol\u00edtica de Privacidad.',
            aiNote: 'Nura usa IA para optimizar tu nutrici\u00f3n.',
        },
        planRenewal: {
            header: 'Renovaci\u00f3n de Plan',
            heroTitle: 'Un nuevo ciclo',
            heroAccent: 'comienza ahora.',
            heroSubtitle: 'Tu consistencia en el \u00faltimo trimestre fue inspiradora. Vamos a recalibrar tu Flow.',
            consistency: 'Consistencia',
            weeksCompleted: 'Semanas Completadas',
            nextChapter: '\u00bfCu\u00e1l es el enfoque para el pr\u00f3ximo cap\u00edtulo?',
            aesthetic: 'Est\u00e9tica',
            aestheticDesc: 'Esculpir y definir',
            health: 'Salud',
            healthDesc: 'Longevidad y equilibrio',
            performance: 'Rendimiento',
            performanceDesc: 'Potencia y resistencia',
            generatePlan: 'Generar Plan Personalizado',
        },
        refinePlan: {
            title: 'Refinando el Flow',
            adjustFlow: 'Ajusta tu Flow',
            aiAnalysis: 'Nuestra IA analiz\u00f3 tus \u00faltimos 90 d\u00edas. El algoritmo sugiere un aumento de prote\u00edna para el pr\u00f3ximo ciclo. Aj\u00fastalo a tu preferencia.',
            currentGoal: 'Objetivo Actual',
            maintain: 'Mantener',
            define: 'Definir',
            gain: 'Ganar',
            workoutRoutine: 'Rutina de Entrenamiento',
            weeklyFrequency: 'Frecuencia Semanal',
            preferredTime: 'Horario Preferido',
            preferredTimeDesc: 'Ajusta el timing de carbohidratos',
            updateBiotype: 'Actualizar Biotipo',
            currentWeight: 'Peso Actual',
            bodyFat: 'Grasa Corporal',
            planPreview: 'Vista Previa del Plan',
            aiOptimized: 'IA OPTIMIZADA',
            dailyGoal: 'Meta Diaria',
            protein: 'Prote\u00edna',
            carbs: 'Carbo',
            fats: 'Grasa',
            generatePlan90: 'Generar Plan (90 D\u00edas)',
        },
        flowAdaptation: {
            title: 'Flow Adaptation',
            syncComplete: 'Sincronizaci\u00f3n Completa',
            activityDetected: 'Actividad Detectada',
            workoutType: 'Tipo de Entrenamiento',
            duration: 'Duraci\u00f3n',
            burned: 'quemados',
            details: 'Detalles',
            kcalAdded: 'Kcal A\u00f1adidos',
            addedMessage: 'Hemos a\u00f1adido <bold>+{kcal}kcal</bold> a tu flow hoy basado en la intensidad de tu actividad.',
            carbs: 'Carbo',
            protein: 'Prote\u00edna',
            fat: 'Grasa',
        },
        macros: {
            prot: 'Prot',
            carb: 'Carb',
            fat: 'Grasa',
        },
        general: {
            back: 'Volver',
            save: 'Guardar',
            next: 'Siguiente',
            done: 'Hecho',
            loading: 'Cargando...',
            error: 'Error',
            success: 'Éxito',
        },
    },
};

// Language codes for Speech Recognition
export const speechLanguageCodes: Record<Language, string> = {
    en: 'en-US',
    pt: 'pt-BR',
    es: 'es-ES',
};
