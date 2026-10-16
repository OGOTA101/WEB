using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.SceneManagement;

internal static class TeacherFpsMockInput
{
    public static bool IsGameplayWindowFocused()
    {
#if UNITY_EDITOR
        var focusedWindow = UnityEditor.EditorWindow.focusedWindow;
        return focusedWindow != null && focusedWindow.GetType().Name == "GameView";
#else
        return Application.isFocused;
#endif
    }
}

public enum TeacherChalkHitZone
{
    None,
    Head,
    Body
}

/// <summary>
/// TeacherPrototypeをPlayするだけでFPSモックを起動するためのランタイムブートストラップ。
/// シーンに一時的なGameObjectを増やさず、既存の教室・生徒配置をそのまま利用する。
/// </summary>
public static class TeacherFpsMockBootstrap
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Install()
    {
        var scene = SceneManager.GetActiveScene();
        var roots = scene.GetRootGameObjects();
        GameObject classroomRoot = null;

        for (var i = 0; i < roots.Length; i++)
        {
            if (roots[i] != null && roots[i].name == "ClassroomRoot")
            {
                classroomRoot = roots[i];
                break;
            }
        }

        if (classroomRoot == null)
        {
            Debug.LogWarning("[TEACHER] ClassroomRoot was not found. FPS mock was not installed.");
            return;
        }

        if (classroomRoot.GetComponent<TeacherFpsMockGame>() == null)
        {
            classroomRoot.AddComponent<TeacherFpsMockGame>();
        }

        var playerCamera = Camera.main;
        if (playerCamera == null)
        {
            var cameras = UnityEngine.Object.FindObjectsByType<Camera>(FindObjectsSortMode.None);
            for (var i = 0; i < cameras.Length; i++)
            {
                if (cameras[i] != null && cameras[i].isActiveAndEnabled)
                {
                    playerCamera = cameras[i];
                    break;
                }
            }
        }

        if (playerCamera != null && playerCamera.GetComponent<TeacherFpsController>() == null)
        {
            playerCamera.gameObject.AddComponent<TeacherFpsController>();
        }

    }
}

/// <summary>
/// 授業進行、照準、チョーク、対象判定、HUD、勝敗をまとめる試作用ゲームループ。
/// </summary>
public sealed class TeacherFpsMockGame : MonoBehaviour
{
    public static TeacherFpsMockGame Instance { get; private set; }

    [Header("授業設定")]
    [SerializeField] private float roundDurationSeconds = 360.0f;
    [SerializeField] private float lessonProgressPerSecond = 0.014f;
    [SerializeField] private float requiredLessonProgress = 1.0f;
    [SerializeField] private int requiredCorrectHits = 3;

    [Header("教室内設定")]
    [SerializeField] private Vector3 blackboardFocusPoint = new Vector3(0.74f, 2.8f, 10.0f);
    // 教卓位置から見下ろす初期視点でも、黒板を見ている判定が外れない許容幅。
    [SerializeField] private float blackboardFocusDot = 0.96f;
    [SerializeField] private float chalkRange = 40.0f;
    [Header("チョーク投擲")]
    [SerializeField] private float chalkSpeed = 9.5f;
    [SerializeField] private float chalkGravity = 9.81f;
    [SerializeField] private float chalkAimDistance = 22.0f;
    [SerializeField] private float chalkFlightTimeMultiplier = 1.30f;
    [SerializeField] private float chalkMinimumFlightTime = 0.34f;
    [SerializeField] private float chalkMaximumFlightTime = 2.25f;
    [SerializeField] private float chalkLaunchRightOffset = 0.34f;
    [SerializeField] private float chalkLaunchVerticalOffset = -0.10f;
    [SerializeField] private float chalkLaunchForwardOffset = 0.42f;
    [SerializeField] private float chalkProjectileRadius = 0.055f;
    [Range(0.2f, 0.95f)]
    [SerializeField] private float trajectoryPreviewFraction = 0.72f;
    [SerializeField] private int trajectoryPreviewPoints = 20;
    [SerializeField] private float trajectoryPreviewWidth = 0.014f;
    [SerializeField] private Color trajectoryPreviewColor = new Color(0.65f, 0.90f, 1.0f, 0.88f);
    [SerializeField] private int maxChalkAmmo = 5;
    [SerializeField] private int timingMistakesBeforeGameOver = 3;

    private readonly List<TeacherStudentTarget> targets = new List<TeacherStudentTarget>();
    private Camera playerCamera;
    private TeacherFpsController fpsController;
    private TeacherPresentationLibrary presentationLibrary;
    private TeacherAudioBank audioBank;
    private Material chalkMaterial;
    private LineRenderer trajectoryPreview;
    private Material trajectoryPreviewMaterial;
    private Vector3 trajectoryAimPoint;
    private Vector3 trajectoryInitialVelocity;
    private float trajectoryFlightTime;
    private bool trajectoryReady;
    private readonly RaycastHit[] aimRaycastHits = new RaycastHit[48];
    private GUIStyle titleStyle;
    private GUIStyle bodyStyle;
    private GUIStyle smallStyle;
    private GUIStyle centerStyle;
    private GUIStyle terminalTitleStyle;
    private bool stylesReady;
    private bool studentsDiscovered;
    private bool terminal;
    private bool cleared;
    private bool fireInputInitialized;
    private bool previousFireMouseHeld;
    private bool previousFireSpaceHeld;
    private float fireInputBlockUntil;
    private string terminalTitle = string.Empty;
    private string terminalReason = string.Empty;
    private string lastMessage = string.Empty;
    private float messageUntil;

    public float CurrentTimeSeconds { get; private set; }
    public float LessonProgress { get; private set; }
    public int CorrectHits { get; private set; }
    public int TimingMistakes { get; private set; }
    public int ChalkAmmo { get; private set; }
    public int MaxChalkAmmo => maxChalkAmmo;
    public bool IsAimingAtBlackboard { get; private set; }
    public TeacherStudentTarget AimTarget { get; private set; }
    public TeacherChalkHitZone AimHitZone { get; private set; }
    public IReadOnlyList<TeacherStudentTarget> Targets => targets;
    public bool IsTerminal => terminal;
    public float RoundDurationSeconds => roundDurationSeconds;
    public int RequiredCorrectHits => requiredCorrectHits;
    public TeacherPresentationLibrary PresentationLibrary => presentationLibrary;
    public TeacherAudioBank AudioBank => audioBank;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(this);
            return;
        }

        Instance = this;
        ChalkAmmo = maxChalkAmmo;
        presentationLibrary = GetComponent<TeacherPresentationLibrary>();
        if (presentationLibrary == null)
        {
            presentationLibrary = gameObject.AddComponent<TeacherPresentationLibrary>();
        }

        audioBank = GetComponent<TeacherAudioBank>();
        if (audioBank == null)
        {
            audioBank = gameObject.AddComponent<TeacherAudioBank>();
        }

        EnsureTrajectoryPreview();

        playerCamera = Camera.main;
        if (playerCamera == null)
        {
            playerCamera = GetComponentInChildren<Camera>(true);
        }

    }

    private void Start()
    {
        if (playerCamera == null)
        {
            playerCamera = Camera.main;
        }

        if (playerCamera != null)
        {
            fpsController = playerCamera.GetComponent<TeacherFpsController>();
        }

        SetMessage("黒板に向いて授業を進め、サボり中の生徒だけを狙おう。", 8.0f);
        fireInputBlockUntil = Time.realtimeSinceStartup + 1.0f;
    }

    private void LateUpdate()
    {
        // StudentAnimationDriverがHumanoidのアイドルを1フレーム評価して
        // 腰を椅子へ合わせた後にターゲットを作る。Awakeで先に作ると、
        // 初期フレームだけ頭部判定が補正前の高さを参照してしまう。
        if (!studentsDiscovered)
        {
            DiscoverStudents();
        }
    }

    private void OnDestroy()
    {
        if (Instance == this)
        {
            Instance = null;
        }

        if (chalkMaterial != null)
        {
            Destroy(chalkMaterial);
            chalkMaterial = null;
        }

        if (trajectoryPreviewMaterial != null)
        {
            Destroy(trajectoryPreviewMaterial);
            trajectoryPreviewMaterial = null;
        }

        if (trajectoryPreview != null)
        {
            Destroy(trajectoryPreview.gameObject);
            trajectoryPreview = null;
        }
    }

    private void DiscoverStudents()
    {
        studentsDiscovered = true;
        targets.Clear();
        var studentsRoot = transform.Find("Students");
        if (studentsRoot == null)
        {
            Debug.LogWarning("[TEACHER] ClassroomRoot/Students was not found.");
            return;
        }

        var drivers = studentsRoot.GetComponentsInChildren<StudentAnimationDriver>(true);
        Array.Sort(drivers, CompareStudentNames);
        var variationSummary = new List<string>(drivers.Length);

        for (var i = 0; i < drivers.Length; i++)
        {
            if (drivers[i] == null)
            {
                continue;
            }

            var target = drivers[i].GetComponent<TeacherStudentTarget>();
            if (target == null)
            {
                target = drivers[i].gameObject.AddComponent<TeacherStudentTarget>();
            }

            // 偶数番の生徒を「サボり対象」、奇数番を「真面目な対象外」とする。
            // サボり対象でも常時ではなく、80秒周期の30秒だけチョークを当てられる。
            var isAllowedTarget = i % 2 == 0;
            var phaseOffset = GetStudentPhaseOffset(drivers[i].name, i);
            var motionSpeed = GetStudentMotionSpeed(drivers[i].name, i);
            drivers[i].SetMotionSpeed(motionSpeed);
            target.Configure(this, drivers[i], i, isAllowedTarget, phaseOffset);
            variationSummary.Add($"{drivers[i].name}:phase={phaseOffset:F1}s,speed={motionSpeed:F2}");

            var indicator = drivers[i].GetComponentInChildren<TeacherStudentIndicator>(true);
            if (indicator == null)
            {
                var indicatorObject = new GameObject("StudentActivityIndicator");
                indicatorObject.transform.SetParent(drivers[i].transform, false);
                indicator = indicatorObject.AddComponent<TeacherStudentIndicator>();
            }

            indicator.Initialize(target, presentationLibrary, playerCamera);
            targets.Add(target);
        }

        if (targets.Count == 0)
        {
            Debug.LogWarning("[TEACHER] No StudentAnimationDriver was found under ClassroomRoot/Students.");
        }
        else
        {
            Debug.Log($"[TEACHER] Runtime targets discovered: students={targets.Count}, allowed={targets.Count(target => target != null && target.IsAllowedTarget)}, firstHead={targets[0].HeadPosition}");
            Debug.Log($"[TEACHER] Student variations: {string.Join(" | ", variationSummary)}");
        }
    }

    private static int CompareStudentNames(StudentAnimationDriver left, StudentAnimationDriver right)
    {
        if (left == null)
        {
            return 1;
        }

        if (right == null)
        {
            return -1;
        }

        return string.Compare(left.name, right.name, StringComparison.OrdinalIgnoreCase);
    }

    private static float GetStudentPhaseOffset(string studentName, int index)
    {
        return GetStableStudentRandom(studentName, index, 0xA3C59AC3u) * TeacherStudentTarget.CycleSeconds;
    }

    private static float GetStudentMotionSpeed(string studentName, int index)
    {
        return Mathf.Lerp(0.8f, 1.2f, GetStableStudentRandom(studentName, index, 0x7F4A7C15u));
    }

    private static float GetStableStudentRandom(string studentName, int index, uint salt)
    {
        unchecked
        {
            uint hash = 2166136261u ^ (uint)index;
            if (!string.IsNullOrEmpty(studentName))
            {
                for (var i = 0; i < studentName.Length; i++)
                {
                    hash ^= studentName[i];
                    hash *= 16777619u;
                }
            }

            hash ^= salt;
            hash *= 16777619u;
            return (hash & 0x00FFFFFFu) / 16777215.0f;
        }
    }

    private void Update()
    {
        if (terminal)
        {
            if (trajectoryPreview != null)
            {
                trajectoryPreview.enabled = false;
            }

            if (Input.GetKeyDown(KeyCode.R))
            {
                ResetRound();
            }

            return;
        }

        var deltaTime = Time.deltaTime;
        CurrentTimeSeconds += deltaTime;
        if (CurrentTimeSeconds >= roundDurationSeconds)
        {
            CurrentTimeSeconds = roundDurationSeconds;
            Finish(false, "授業時間終了", "制限時間内に授業ノルマを終えられなかった。");
            return;
        }

        IsAimingAtBlackboard = IsPlayerAimingAtBlackboard();
        if (IsAimingAtBlackboard)
        {
            LessonProgress = Mathf.Clamp01(LessonProgress + deltaTime * lessonProgressPerSecond);
        }

        for (var i = 0; i < targets.Count; i++)
        {
            if (targets[i] != null)
            {
                targets[i].Tick(deltaTime, IsAimingAtBlackboard, CurrentTimeSeconds);
            }
        }

        AimTarget = FindTargetUnderReticle();
        UpdateTrajectoryPreview();

        if (ConsumeFireInput())
        {
            FireChalk();
        }

        if (Input.GetKeyDown(KeyCode.R))
        {
            if (IsNearBlackboard())
            {
                if (ChalkAmmo < maxChalkAmmo)
                {
                    ChalkAmmo = maxChalkAmmo;
                    if (audioBank != null && playerCamera != null)
                    {
                        audioBank.Play(TeacherSoundCue.ChalkReload, playerCamera.transform.position);
                    }

                    SetMessage("黒板前の引き出しでチョークをリロードした。", 2.5f);
                }
                else
                {
                    SetMessage("チョークは満タンです。", 1.5f);
                }
            }
            else
            {
                SetMessage("リロードは黒板前で行える。", 2.0f);
            }
        }
    }

    private bool ConsumeFireInput()
    {
        // GetMouseButtonDown/GetKeyDown can contain the click/key event used to enter Play mode
        // in the Editor. Track the held state so that a shot requires a fresh press after startup.
        var mouseHeld = Input.GetMouseButton(0);
        var spaceHeld = Input.GetKey(KeyCode.Space);
        if (!fireInputInitialized)
        {
            previousFireMouseHeld = mouseHeld;
            previousFireSpaceHeld = spaceHeld;
            fireInputInitialized = true;
            return false;
        }

        var mousePressed = mouseHeld && !previousFireMouseHeld;
        var spacePressed = spaceHeld && !previousFireSpaceHeld;
        previousFireMouseHeld = mouseHeld;
        previousFireSpaceHeld = spaceHeld;

        if (Time.realtimeSinceStartup < fireInputBlockUntil)
        {
            return false;
        }

        return TeacherFpsMockInput.IsGameplayWindowFocused()
            && Cursor.lockState == CursorLockMode.Locked
            && (mousePressed || spacePressed);
    }

    private bool IsPlayerAimingAtBlackboard()
    {
        if (playerCamera == null)
        {
            return false;
        }

        var focusPoint = transform.TransformPoint(blackboardFocusPoint);
        var toFocus = focusPoint - playerCamera.transform.position;
        if (toFocus.sqrMagnitude < 0.01f)
        {
            return true;
        }

        return Vector3.Dot(playerCamera.transform.forward, toFocus.normalized) >= blackboardFocusDot;
    }

    private TeacherStudentTarget FindTargetUnderReticle()
    {
        AimHitZone = TeacherChalkHitZone.None;
        if (playerCamera == null)
        {
            return null;
        }

        var ray = new Ray(playerCamera.transform.position, playerCamera.transform.forward);
        TeacherStudentTarget bestTarget = null;
        var bestHitZone = TeacherChalkHitZone.None;
        var bestDistance = chalkRange;

        for (var i = 0; i < targets.Count; i++)
        {
            var target = targets[i];
            if (target == null || !target.isActiveAndEnabled)
            {
                continue;
            }

            if (target.TryGetRayHit(ray, chalkRange, out var distance, out var hitZone) && distance < bestDistance)
            {
                bestTarget = target;
                bestHitZone = hitZone;
                bestDistance = distance;
            }
        }

        AimHitZone = bestHitZone;
        return bestTarget;
    }

    private void EnsureTrajectoryPreview()
    {
        if (trajectoryPreview != null)
        {
            return;
        }

        var previewObject = new GameObject("ChalkTrajectoryPreview_Runtime");
        previewObject.transform.SetParent(transform, false);
        trajectoryPreview = previewObject.AddComponent<LineRenderer>();
        trajectoryPreview.useWorldSpace = true;
        trajectoryPreview.alignment = LineAlignment.View;
        trajectoryPreview.textureMode = LineTextureMode.Stretch;
        trajectoryPreview.numCapVertices = 2;
        trajectoryPreview.numCornerVertices = 2;
        trajectoryPreview.widthMultiplier = Mathf.Max(0.002f, trajectoryPreviewWidth);
        trajectoryPreview.startColor = trajectoryPreviewColor;
        trajectoryPreview.endColor = new Color(trajectoryPreviewColor.r, trajectoryPreviewColor.g, trajectoryPreviewColor.b, trajectoryPreviewColor.a * 0.35f);

        var shader = Shader.Find("Universal Render Pipeline/Unlit");
        if (shader == null)
        {
            shader = Shader.Find("Sprites/Default");
        }

        if (shader != null)
        {
            trajectoryPreviewMaterial = new Material(shader)
            {
                name = "Teacher Chalk Trajectory Preview Runtime Material"
            };
            if (trajectoryPreviewMaterial.HasProperty("_BaseColor"))
            {
                trajectoryPreviewMaterial.SetColor("_BaseColor", trajectoryPreviewColor);
            }
            if (trajectoryPreviewMaterial.HasProperty("_Color"))
            {
                trajectoryPreviewMaterial.SetColor("_Color", trajectoryPreviewColor);
            }

            trajectoryPreview.sharedMaterial = trajectoryPreviewMaterial;
        }

        trajectoryPreview.positionCount = 0;
        trajectoryPreview.enabled = false;
    }

    private Vector3 GetChalkLaunchOrigin()
    {
        if (playerCamera == null)
        {
            return transform.position;
        }

        var cameraTransform = playerCamera.transform;
        // カメラ中央のレティクルへ、右側の手元からチョークが入ってくる見た目にする。
        return cameraTransform.position
            + cameraTransform.right * chalkLaunchRightOffset
            + cameraTransform.up * chalkLaunchVerticalOffset
            + cameraTransform.forward * chalkLaunchForwardOffset;
    }

    private Vector3 GetChalkGravity()
    {
        return Vector3.down * Mathf.Abs(chalkGravity);
    }

    private Vector3 GetChalkAimPoint(TeacherStudentTarget target, TeacherChalkHitZone hitZone)
    {
        if (target != null)
        {
            return target.GetHitPosition(hitZone == TeacherChalkHitZone.None ? TeacherChalkHitZone.Head : hitZone);
        }

        TryGetEnvironmentAimPoint(out var environmentPoint);
        return environmentPoint;
    }

    private bool TryGetEnvironmentAimPoint(out Vector3 point)
    {
        point = playerCamera == null
            ? transform.position + transform.forward * chalkAimDistance
            : playerCamera.transform.position + playerCamera.transform.forward * chalkAimDistance;

        if (playerCamera == null)
        {
            return false;
        }

        var ray = new Ray(playerCamera.transform.position, playerCamera.transform.forward);
        var hitCount = Physics.RaycastNonAlloc(ray, aimRaycastHits, chalkAimDistance, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
        var found = false;
        var nearestDistance = chalkAimDistance;
        for (var i = 0; i < hitCount; i++)
        {
            var hit = aimRaycastHits[i];
            if (hit.collider == null || ShouldIgnoreChalkCollider(hit.collider) || hit.distance >= nearestDistance)
            {
                continue;
            }

            point = hit.point;
            nearestDistance = hit.distance;
            found = true;
        }

        return found;
    }

    private bool TryBuildBallisticTrajectory(Vector3 origin, Vector3 destination, out Vector3 initialVelocity, out float flightTime)
    {
        initialVelocity = Vector3.zero;
        flightTime = 0.0f;
        var displacement = destination - origin;
        if (displacement.sqrMagnitude < 0.0001f)
        {
            return false;
        }

        var horizontalDistance = new Vector3(displacement.x, 0.0f, displacement.z).magnitude;
        var distanceForTiming = Mathf.Max(horizontalDistance, displacement.magnitude);
        var speedForTiming = Mathf.Max(0.1f, chalkSpeed);
        flightTime = Mathf.Clamp(
            distanceForTiming / speedForTiming * Mathf.Max(0.1f, chalkFlightTimeMultiplier),
            Mathf.Max(0.05f, chalkMinimumFlightTime),
            Mathf.Max(chalkMinimumFlightTime, chalkMaximumFlightTime));

        var gravity = GetChalkGravity();
        initialVelocity = (displacement - 0.5f * gravity * flightTime * flightTime) / flightTime;
        return initialVelocity.sqrMagnitude > 0.0001f
            && !float.IsNaN(initialVelocity.x) && !float.IsInfinity(initialVelocity.x)
            && !float.IsNaN(initialVelocity.y) && !float.IsInfinity(initialVelocity.y)
            && !float.IsNaN(initialVelocity.z) && !float.IsInfinity(initialVelocity.z);
    }

    private static Vector3 EvaluateTrajectory(Vector3 origin, Vector3 initialVelocity, Vector3 gravity, float time)
    {
        return origin + initialVelocity * time + 0.5f * gravity * time * time;
    }

    private void UpdateTrajectoryPreview()
    {
        if (trajectoryPreview == null || playerCamera == null)
        {
            return;
        }

        var target = AimTarget;
        var hitZone = target == null || AimHitZone == TeacherChalkHitZone.None
            ? TeacherChalkHitZone.Head
            : AimHitZone;
        var aimPoint = GetChalkAimPoint(target, hitZone);
        var origin = GetChalkLaunchOrigin();

        if (!TryBuildBallisticTrajectory(origin, aimPoint, out var initialVelocity, out var flightTime))
        {
            trajectoryReady = false;
            trajectoryPreview.enabled = false;
            return;
        }

        trajectoryAimPoint = aimPoint;
        trajectoryInitialVelocity = initialVelocity;
        trajectoryFlightTime = flightTime;
        trajectoryReady = true;

        var pointCount = Mathf.Max(2, trajectoryPreviewPoints);
        trajectoryPreview.positionCount = pointCount;
        var previewTime = flightTime * Mathf.Clamp01(trajectoryPreviewFraction);
        var gravity = GetChalkGravity();
        for (var i = 0; i < pointCount; i++)
        {
            var normalized = pointCount <= 1 ? 0.0f : (float)i / (pointCount - 1);
            trajectoryPreview.SetPosition(i, EvaluateTrajectory(origin, initialVelocity, gravity, previewTime * normalized));
        }

        trajectoryPreview.startColor = trajectoryPreviewColor;
        trajectoryPreview.endColor = new Color(trajectoryPreviewColor.r, trajectoryPreviewColor.g, trajectoryPreviewColor.b, trajectoryPreviewColor.a * 0.35f);
        trajectoryPreview.widthMultiplier = Mathf.Max(0.002f, trajectoryPreviewWidth);
        trajectoryPreview.enabled = true;
    }

    internal static bool ShouldIgnoreChalkCollider(Collider collider)
    {
        if (collider == null)
        {
            return true;
        }

        if (collider.GetComponentInParent<TeacherStudentTarget>() != null
            || collider.GetComponentInParent<TeacherFpsController>() != null)
        {
            return true;
        }

        return collider.gameObject.name.StartsWith("TeacherStageBoundary_", StringComparison.Ordinal);
    }

    internal bool TryGetChalkTargetHit(
        Vector3 start,
        Vector3 end,
        float projectileRadius,
        out TeacherStudentTarget hitTarget,
        out TeacherChalkHitZone hitZone,
        out Vector3 hitPosition,
        out float distance)
    {
        hitTarget = null;
        hitZone = TeacherChalkHitZone.None;
        hitPosition = end;
        distance = float.PositiveInfinity;

        for (var i = 0; i < targets.Count; i++)
        {
            var target = targets[i];
            if (target == null || !target.isActiveAndEnabled)
            {
                continue;
            }

            if (target.TryGetSegmentHit(start, end, projectileRadius, out var targetDistance, out var targetZone, out var targetPosition)
                && targetDistance < distance)
            {
                hitTarget = target;
                hitZone = targetZone;
                hitPosition = targetPosition;
                distance = targetDistance;
            }
        }

        return hitTarget != null;
    }

    private void FireChalk()
    {
        if (playerCamera == null)
        {
            return;
        }

        if (ChalkAmmo <= 0)
        {
            SetMessage("チョーク切れ。黒板前でRキーを押してリロードしよう。", 2.5f);
            return;
        }

        var target = AimTarget != null ? AimTarget : FindTargetUnderReticle();
        var hitZone = target == null ? TeacherChalkHitZone.None : AimHitZone;
        if (target != null && hitZone == TeacherChalkHitZone.None)
        {
            var ray = new Ray(playerCamera.transform.position, playerCamera.transform.forward);
            target.TryGetRayHit(ray, chalkRange, out _, out hitZone);
        }
        var aimPoint = GetChalkAimPoint(target, hitZone);
        var origin = GetChalkLaunchOrigin();
        if (!TryBuildBallisticTrajectory(origin, aimPoint, out var initialVelocity, out var flightTime))
        {
            return;
        }

        ChalkAmmo--;
        var gravity = GetChalkGravity();
        var flightDirection = initialVelocity.sqrMagnitude > 0.0001f
            ? initialVelocity.normalized
            : playerCamera.transform.forward;
        var chalkObject = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        chalkObject.name = "ChalkProjectile_Runtime";
        var collider = chalkObject.GetComponent<Collider>();
        if (collider != null)
        {
            Destroy(collider);
        }

        chalkObject.transform.position = origin;
        chalkObject.transform.rotation = Quaternion.FromToRotation(Vector3.up, flightDirection);
        chalkObject.transform.localScale = new Vector3(0.055f, 0.18f, 0.055f);

        var material = GetChalkMaterial();
        var renderer = chalkObject.GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.sharedMaterial = material;
        }

        var projectile = chalkObject.AddComponent<TeacherChalkProjectile>();
        projectile.Initialize(this, origin, initialVelocity, gravity, flightTime, chalkProjectileRadius, material);
        if (presentationLibrary != null)
        {
            presentationLibrary.PlayChalkLaunch(origin, flightDirection);
        }

        if (audioBank != null)
        {
            audioBank.Play(TeacherSoundCue.ChalkThrow, origin);
        }

        var zoneLabel = hitZone == TeacherChalkHitZone.Body ? "身体" : "額";
        SetMessage(target == null ? "予測軌道でチョークを投げた。" : $"{target.DisplayName}の{zoneLabel}へ予測軌道で投げた。", 1.5f);
    }

    // エディタのPlaytestメニューから、入力なしで弾道・着弾を確認するための入口。
    public void PlaytestFireChalk()
    {
        if (!Application.isPlaying)
        {
            Debug.LogWarning("[TEACHER] Ballistic chalk playtest requires Play Mode.");
            return;
        }

        FireChalk();
    }

    private Material GetChalkMaterial()
    {
        if (chalkMaterial != null)
        {
            return chalkMaterial;
        }

        var shader = Shader.Find("Universal Render Pipeline/Lit");
        if (shader == null)
        {
            shader = Shader.Find("Standard");
        }

        if (shader == null)
        {
            return null;
        }

        chalkMaterial = new Material(shader)
        {
            name = "Teacher Chalk Runtime Material",
            color = new Color(0.96f, 0.98f, 1.0f, 1.0f)
        };
        return chalkMaterial;
    }

    public void ResolveProjectileImpact(TeacherStudentTarget target)
    {
        ResolveProjectileImpact(target, TeacherChalkHitZone.Head, target == null ? transform.position : target.HeadPosition);
    }

    public void ResolveProjectileImpact(TeacherStudentTarget target, TeacherChalkHitZone hitZone)
    {
        ResolveProjectileImpact(target, hitZone, target == null ? transform.position : target.GetHitPosition(hitZone));
    }

    public void ResolveProjectileImpact(TeacherStudentTarget target, TeacherChalkHitZone hitZone, Vector3 impactPosition)
    {
        if (terminal)
        {
            return;
        }

        if (target == null)
        {
            ResolveProjectileEnvironmentImpact(impactPosition, Vector3.up);
            return;
        }

        if (!target.IsAllowedTarget)
        {
            target.ApplyWrongTargetPenalty();
            if (hitZone == TeacherChalkHitZone.Body)
            {
                target.ReactBodyShot();
                PlayImpactPresentation(TeacherChalkEffectType.BodyHit, TeacherSoundCue.ChalkWrongTarget, impactPosition);
                RegisterTimingMistake($"{target.DisplayName}の身体に当たった。真面目な生徒への誤射で理解度が下がった。");
            }
            else
            {
                target.ReactWrongShot();
                PlayImpactPresentation(TeacherChalkEffectType.WrongTarget, TeacherSoundCue.ChalkWrongTarget, impactPosition);
                RegisterTimingMistake($"{target.DisplayName}は真面目に授業を受けていた。誤射で理解度が下がった。");
            }
            return;
        }

        if (target.HasBeenHitInCurrentWindow(CurrentTimeSeconds))
        {
            PlayImpactPresentation(TeacherChalkEffectType.TimingMistake, TeacherSoundCue.ChalkWrongTarget, impactPosition);
            SetMessage($"{target.DisplayName}はこの時間帯ですでに命中済み。", 2.0f);
            return;
        }

        if (!target.IsDistractingAt(CurrentTimeSeconds))
        {
            if (hitZone == TeacherChalkHitZone.Body)
            {
                target.ApplyBodyHitPenalty();
                target.ReactBodyShot();
                PlayImpactPresentation(TeacherChalkEffectType.BodyHit, TeacherSoundCue.ChalkWrongTarget, impactPosition);
                RegisterTimingMistake($"{target.DisplayName}の身体に当たった。額を狙うタイミングではない。");
            }
            else
            {
                target.ApplyTimingPenalty();
                PlayImpactPresentation(TeacherChalkEffectType.TimingMistake, TeacherSoundCue.ChalkWrongTarget, impactPosition);
                RegisterTimingMistake($"{target.DisplayName}はサボりのタイミングではない。");
            }
            return;
        }

        if (hitZone == TeacherChalkHitZone.Body)
        {
            target.ApplyBodyHitPenalty();
            target.ReactBodyShot();
            PlayImpactPresentation(TeacherChalkEffectType.BodyHit, TeacherSoundCue.ChalkBodyHit, impactPosition);
            RegisterTimingMistake($"{target.DisplayName}の身体に当たった。命中判定は額のみ。");
            return;
        }

        target.RegisterCorrectHit(CurrentTimeSeconds);
        CorrectHits++;
        PlayImpactPresentation(TeacherChalkEffectType.HeadHit, TeacherSoundCue.ChalkHeadHit, impactPosition);
        SetMessage($"{target.DisplayName}に命中。授業を続けよう。", 2.0f);

        if (CorrectHits >= requiredCorrectHits && LessonProgress >= requiredLessonProgress)
        {
            Finish(true, "ゲームクリア", "授業ノルマを進めながら、サボり中の生徒に3回命中させた。");
        }
        else if (CorrectHits >= requiredCorrectHits)
        {
            SetMessage("命中ノルマ達成。黒板に向いて授業ノルマを完了しよう。", 3.0f);
        }
    }

    public void ResolveProjectileEnvironmentImpact(Vector3 impactPosition, Vector3 impactNormal)
    {
        if (terminal)
        {
            return;
        }

        PlayImpactPresentation(TeacherChalkEffectType.Environment, TeacherSoundCue.ChalkWorldHit, impactPosition, impactNormal);
        RegisterTimingMistake("生徒以外（地面・机など）に当たった。外れです。");
    }

    private void PlayImpactPresentation(TeacherChalkEffectType effectType, TeacherSoundCue soundCue, Vector3 impactPosition)
    {
        PlayImpactPresentation(effectType, soundCue, impactPosition, Vector3.up);
    }

    private void PlayImpactPresentation(
        TeacherChalkEffectType effectType,
        TeacherSoundCue soundCue,
        Vector3 impactPosition,
        Vector3 impactNormal)
    {
        if (presentationLibrary != null)
        {
            var safeNormal = impactNormal.sqrMagnitude > 0.0001f ? impactNormal.normalized : Vector3.up;
            presentationLibrary.PlayChalkImpact(effectType, impactPosition, safeNormal);
        }

        if (audioBank != null)
        {
            audioBank.Play(soundCue, impactPosition);
        }
    }

    public void PreviewChalkPresentation()
    {
        if (!Application.isPlaying)
        {
            Debug.LogWarning("[TEACHER] Chalk presentation preview requires Play Mode.");
            return;
        }

        if (playerCamera == null)
        {
            playerCamera = Camera.main;
        }

        if (presentationLibrary == null)
        {
            presentationLibrary = GetComponent<TeacherPresentationLibrary>();
        }

        if (playerCamera == null || presentationLibrary == null)
        {
            Debug.LogWarning("[TEACHER] Chalk presentation preview could not find the camera or presentation library.");
            return;
        }

        var origin = GetChalkLaunchOrigin();
        var previewDirection = trajectoryReady && trajectoryInitialVelocity.sqrMagnitude > 0.0001f
            ? trajectoryInitialVelocity.normalized
            : playerCamera.transform.forward;
        presentationLibrary.PlayChalkLaunch(origin, previewDirection);
        if (audioBank != null)
        {
            audioBank.Play(TeacherSoundCue.ChalkThrow, origin);
        }

        if (targets.Count > 0 && targets[0] != null)
        {
            var head = targets[0].HeadPosition;
            presentationLibrary.PlayChalkImpact(TeacherChalkEffectType.HeadHit, head, Vector3.up);
            audioBank?.Play(TeacherSoundCue.ChalkHeadHit, head);
        }

        if (targets.Count > 1 && targets[1] != null)
        {
            var body = targets[1].BodyPosition;
            presentationLibrary.PlayChalkImpact(TeacherChalkEffectType.BodyHit, body, Vector3.up);
            audioBank?.Play(TeacherSoundCue.ChalkBodyHit, body);
        }

        var environment = origin + playerCamera.transform.forward * 4.0f;
        presentationLibrary.PlayChalkImpact(TeacherChalkEffectType.Environment, environment, Vector3.up);
        audioBank?.Play(TeacherSoundCue.ChalkWorldHit, environment);
        SetMessage("チョーク演出プレビュー：発射・額・身体・環境", 3.0f);
        Debug.Log("[TEACHER] Chalk presentation preview spawned: launch, head, body, environment.");
    }

    private void RegisterTimingMistake(string message)
    {
        TimingMistakes++;
        SetMessage($"{message} ミス {TimingMistakes}/{timingMistakesBeforeGameOver}", 2.5f);
        if (TimingMistakes >= timingMistakesBeforeGameOver)
        {
            Finish(false, "ゲームオーバー", "チョーク投げのミスが重なり、授業を続けられなくなった。");
        }
    }

    private void Finish(bool didClear, string title, string reason)
    {
        if (terminal)
        {
            return;
        }

        terminal = true;
        cleared = didClear;
        terminalTitle = title;
        terminalReason = reason;
        if (audioBank != null && playerCamera != null)
        {
            audioBank.Play(didClear ? TeacherSoundCue.RoundClear : TeacherSoundCue.RoundGameOver, playerCamera.transform.position);
        }

        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }

    private void ResetRound()
    {
        terminal = false;
        cleared = false;
        terminalTitle = string.Empty;
        terminalReason = string.Empty;
        CurrentTimeSeconds = 0.0f;
        LessonProgress = 0.0f;
        CorrectHits = 0;
        TimingMistakes = 0;
        ChalkAmmo = maxChalkAmmo;
        fireInputInitialized = false;
        previousFireMouseHeld = false;
        previousFireSpaceHeld = false;
        fireInputBlockUntil = Time.realtimeSinceStartup + 0.5f;

        for (var i = 0; i < targets.Count; i++)
        {
            if (targets[i] != null)
            {
                targets[i].ResetForRound();
            }
        }

        if (fpsController == null && playerCamera != null)
        {
            fpsController = playerCamera.GetComponent<TeacherFpsController>();
        }

        if (fpsController != null)
        {
            fpsController.ResetToSpawn();
        }

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
        SetMessage("リスタート。黒板に向いて授業を進めよう。", 3.0f);
    }

    private void SetMessage(string message, float duration)
    {
        lastMessage = message;
        messageUntil = CurrentTimeSeconds + duration;
    }

    private bool IsNearBlackboard()
    {
        if (playerCamera == null)
        {
            return false;
        }

        var focusPoint = transform.TransformPoint(blackboardFocusPoint);
        var playerPosition = playerCamera.transform.position;
        focusPoint.y = playerPosition.y;
        return Vector3.Distance(playerPosition, focusPoint) <= 4.0f;
    }

    private string GetClockTime()
    {
        var lessonSeconds = Mathf.Clamp(CurrentTimeSeconds / Mathf.Max(1.0f, roundDurationSeconds) * 3600.0f, 0.0f, 3600.0f);
        var minutes = Mathf.FloorToInt(lessonSeconds / 60.0f);
        var seconds = Mathf.FloorToInt(lessonSeconds % 60.0f);
        return $"{minutes:00}:{seconds:00}";
    }

    private string GetRemainingRealTime()
    {
        var remaining = Mathf.Max(0.0f, roundDurationSeconds - CurrentTimeSeconds);
        var minutes = Mathf.FloorToInt(remaining / 60.0f);
        var seconds = Mathf.FloorToInt(remaining % 60.0f);
        return $"{minutes:00}:{seconds:00}";
    }

    private void EnsureStyles()
    {
        if (stylesReady)
        {
            return;
        }

        titleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 20,
            fontStyle = FontStyle.Bold,
            normal = { textColor = Color.white }
        };
        bodyStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 15,
            normal = { textColor = Color.white }
        };
        smallStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            normal = { textColor = new Color(0.86f, 0.9f, 0.95f, 1.0f) }
        };
        centerStyle = new GUIStyle(GUI.skin.label)
        {
            alignment = TextAnchor.MiddleCenter,
            fontSize = 28,
            fontStyle = FontStyle.Bold,
            normal = { textColor = Color.white }
        };
        terminalTitleStyle = new GUIStyle(GUI.skin.label)
        {
            alignment = TextAnchor.MiddleCenter,
            fontSize = 28,
            fontStyle = FontStyle.Bold,
            normal = { textColor = Color.white }
        };
        stylesReady = true;
    }

    private void OnGUI()
    {
        if (!Application.isPlaying)
        {
            return;
        }

        EnsureStyles();
        DrawTopLeftHud();
        DrawTopRightHud();
        DrawStudentStatusHud();
        DrawReticle();
        DrawControls();
        DrawTerminalOverlay();
    }

    private void DrawTopLeftHud()
    {
        var panel = new Rect(16.0f, 16.0f, 350.0f, 144.0f);
        DrawPanel(panel, new Color(0.03f, 0.06f, 0.1f, 0.86f));
        GUI.Label(new Rect(panel.x + 14.0f, panel.y + 10.0f, 320.0f, 28.0f), "TEACHER  /  授業FPSモック", titleStyle);
        GUI.Label(new Rect(panel.x + 14.0f, panel.y + 45.0f, 320.0f, 22.0f), $"授業時計  {GetClockTime()} / 60:00", bodyStyle);
        GUI.Label(new Rect(panel.x + 14.0f, panel.y + 70.0f, 320.0f, 20.0f), $"実時間の残り  {GetRemainingRealTime()}  （1周6分）", smallStyle);
        GUI.Label(new Rect(panel.x + 14.0f, panel.y + 96.0f, 320.0f, 20.0f), $"授業ノルマ  {Mathf.RoundToInt(LessonProgress * 100.0f)}%", bodyStyle);
        DrawBar(new Rect(panel.x + 14.0f, panel.y + 121.0f, 320.0f, 10.0f), LessonProgress, new Color(0.16f, 0.2f, 0.25f, 1.0f), new Color(0.25f, 0.78f, 0.95f, 1.0f));
    }

    private void DrawTopRightHud()
    {
        var panel = new Rect(Screen.width - 250.0f, 16.0f, 234.0f, 114.0f);
        DrawPanel(panel, new Color(0.03f, 0.06f, 0.1f, 0.86f));
        GUI.Label(new Rect(panel.x + 12.0f, panel.y + 10.0f, 210.0f, 22.0f), $"命中  {CorrectHits} / {requiredCorrectHits}", bodyStyle);
        GUI.Label(new Rect(panel.x + 12.0f, panel.y + 38.0f, 210.0f, 22.0f), $"タイミングミス  {TimingMistakes} / {timingMistakesBeforeGameOver}", bodyStyle);
        GUI.Label(new Rect(panel.x + 12.0f, panel.y + 66.0f, 210.0f, 22.0f), $"残弾  {ChalkAmmo} / {maxChalkAmmo}", bodyStyle);
    }

    private void DrawStudentStatusHud()
    {
        if (targets.Count == 0)
        {
            return;
        }

        var width = 332.0f;
        var rowHeight = 27.0f;
        var panel = new Rect(Screen.width - width - 16.0f, 140.0f, width, 50.0f + rowHeight * targets.Count);
        DrawPanel(panel, new Color(0.03f, 0.06f, 0.1f, 0.86f));
        GUI.Label(new Rect(panel.x + 12.0f, panel.y + 8.0f, width - 24.0f, 22.0f), "生徒ターゲット情報", bodyStyle);

        for (var i = 0; i < targets.Count; i++)
        {
            var target = targets[i];
            if (target == null)
            {
                continue;
            }

            var row = new Rect(panel.x + 10.0f, panel.y + 34.0f + i * rowHeight, width - 20.0f, rowHeight - 2.0f);
            var statusColor = !target.IsAllowedTarget
                ? new Color(0.55f, 0.58f, 0.62f, 1.0f)
                : target.IsDistractingAt(CurrentTimeSeconds)
                    ? new Color(0.24f, 0.85f, 0.48f, 1.0f)
                    : new Color(0.92f, 0.68f, 0.24f, 1.0f);

            var previous = GUI.color;
            GUI.color = new Color(statusColor.r, statusColor.g, statusColor.b, 0.18f);
            GUI.Box(row, GUIContent.none);
            GUI.color = statusColor;
            GUI.Label(new Rect(row.x + 6.0f, row.y + 3.0f, 76.0f, 18.0f), target.DisplayName.Replace("Student_", "S"), smallStyle);
            DrawBar(new Rect(row.x + 80.0f, row.y + 8.0f, 82.0f, 9.0f), target.Understanding, new Color(0.15f, 0.18f, 0.22f, 1.0f), statusColor);
            var activitySprite = presentationLibrary == null
                ? null
                : presentationLibrary.GetActivitySprite(target.GetActivityState(CurrentTimeSeconds));
            if (activitySprite != null)
            {
                DrawSpriteIcon(activitySprite, new Rect(row.x + 166.0f, row.y + 3.0f, 20.0f, 20.0f));
            }

            GUI.Label(new Rect(row.x + 190.0f, row.y + 3.0f, row.width - 196.0f, 18.0f), target.GetStatusLabel(CurrentTimeSeconds), smallStyle);
            GUI.color = previous;
        }
    }

    private static void DrawSpriteIcon(Sprite sprite, Rect destination)
    {
        if (sprite == null || sprite.texture == null)
        {
            return;
        }

        var texture = sprite.texture;
        var rect = sprite.textureRect;
        var uv = new Rect(
            rect.x / texture.width,
            rect.y / texture.height,
            rect.width / texture.width,
            rect.height / texture.height);
        GUI.DrawTextureWithTexCoords(destination, texture, uv, true);
    }

    private void DrawReticle()
    {
        var reticleColor = Color.white;
        if (AimTarget != null)
        {
            reticleColor = !AimTarget.IsAllowedTarget
                ? new Color(1.0f, 0.3f, 0.3f, 1.0f)
                : AimHitZone == TeacherChalkHitZone.Body
                    ? new Color(1.0f, 0.55f, 0.18f, 1.0f)
                    : AimTarget.IsDistractingAt(CurrentTimeSeconds)
                        ? new Color(0.35f, 1.0f, 0.55f, 1.0f)
                        : new Color(1.0f, 0.75f, 0.25f, 1.0f);
        }

        var previous = GUI.color;
        GUI.color = reticleColor;
        var center = new Vector2(Screen.width * 0.5f, Screen.height * 0.5f);
        GUI.Label(new Rect(center.x - 24.0f, center.y - 20.0f, 48.0f, 40.0f), "+", centerStyle);
        GUI.Box(new Rect(center.x - 18.0f, center.y - 1.0f, 8.0f, 2.0f), GUIContent.none);
        GUI.Box(new Rect(center.x + 10.0f, center.y - 1.0f, 8.0f, 2.0f), GUIContent.none);
        GUI.Box(new Rect(center.x - 1.0f, center.y - 18.0f, 2.0f, 8.0f), GUIContent.none);
        GUI.Box(new Rect(center.x - 1.0f, center.y + 10.0f, 2.0f, 8.0f), GUIContent.none);
        if (AimTarget != null)
        {
            var zoneLabel = AimHitZone == TeacherChalkHitZone.Body ? "身体" : "額";
            GUI.Label(new Rect(center.x - 30.0f, center.y + 22.0f, 60.0f, 18.0f), zoneLabel, smallStyle);
        }
        GUI.color = previous;
    }

    private void DrawControls()
    {
        var panel = new Rect(16.0f, Screen.height - 54.0f, Screen.width - 32.0f, 38.0f);
        DrawPanel(panel, new Color(0.03f, 0.06f, 0.1f, 0.7f));
        GUI.Label(new Rect(panel.x + 12.0f, panel.y + 9.0f, panel.width - 24.0f, 20.0f), "WASD:移動　マウス/矢印:視点　左クリック/Space:チョーク　R:黒板前リロード／結果画面でリスタート　Esc:カーソル", smallStyle);
    }

    private void DrawTerminalOverlay()
    {
        if (!terminal)
        {
            var message = CurrentTimeSeconds <= messageUntil ? lastMessage : string.Empty;
            if (!string.IsNullOrEmpty(message))
            {
                GUI.Label(new Rect(20.0f, Screen.height - 86.0f, Screen.width - 40.0f, 24.0f), message, bodyStyle);
            }

            return;
        }

        var box = new Rect(Screen.width * 0.5f - 260.0f, Screen.height * 0.5f - 120.0f, 520.0f, 240.0f);
        DrawPanel(box, cleared ? new Color(0.05f, 0.22f, 0.12f, 0.94f) : new Color(0.25f, 0.06f, 0.07f, 0.94f));
        GUI.Label(new Rect(box.x + 20.0f, box.y + 24.0f, box.width - 40.0f, 44.0f), terminalTitle, terminalTitleStyle);
        GUI.Label(new Rect(box.x + 34.0f, box.y + 86.0f, box.width - 68.0f, 64.0f), terminalReason, bodyStyle);
        GUI.Label(new Rect(box.x + 20.0f, box.y + 180.0f, box.width - 40.0f, 24.0f), "Rキーでリスタート", smallStyle);
    }

    private void DrawPanel(Rect rect, Color color)
    {
        var previous = GUI.color;
        GUI.color = color;
        GUI.Box(rect, GUIContent.none);
        GUI.color = previous;
    }

    private void DrawBar(Rect rect, float value, Color background, Color foreground)
    {
        var previous = GUI.color;
        GUI.color = background;
        GUI.Box(rect, GUIContent.none);
        GUI.color = foreground;
        GUI.Box(new Rect(rect.x, rect.y, rect.width * Mathf.Clamp01(value), rect.height), GUIContent.none);
        GUI.color = previous;
    }
}

/// <summary>
/// 先生の透明FPS視点。カメラ自身を移動させるため、先生の身体や腕は表示しない。
/// </summary>
[RequireComponent(typeof(CharacterController))]
public sealed class TeacherFpsController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 4.5f;
    [SerializeField] private float sprintMultiplier = 1.45f;
    [SerializeField] private float lookSensitivity = 2.2f;
    [SerializeField] private float keyboardLookSpeed = 75.0f;
    [SerializeField] private float minPitch = -70.0f;
    [SerializeField] private float maxPitch = 70.0f;
    // 教師は生徒の頭部より高い位置から教室を見渡す。
    [SerializeField] private float eyeHeight = 2.20f;
    [SerializeField] private Vector2 xBounds = new Vector2(-2.10f, 3.55f);
    [SerializeField] private Vector2 zBounds = new Vector2(6.55f, 9.20f);
    [SerializeField] private float controllerHeight = 2.20f;
    [SerializeField] private float controllerRadius = 0.22f;

    private Vector3 spawnPosition;
    private float yaw;
    private float pitch;
    private bool initialized;
    private float ignoreInputUntil;
    private Transform sceneRoot;
    private Vector3 sceneRootPosition;
    private Quaternion sceneRootRotation;
    private Vector3 sceneRootScale;
    private bool ignoreInputForFrame;
    private CharacterController characterController;

    private void Start()
    {
        CacheSceneRoot();
        EnsureCharacterController();
        ResetToSpawn();
        Debug.Log($"[TEACHER] FPS controller ready: eyeHeight={eyeHeight:F2}, stageBounds=x({xBounds.x:F2}..{xBounds.y:F2}) z({zBounds.x:F2}..{zBounds.y:F2}), grounded={characterController != null && characterController.isGrounded}");
    }

    private void Update()
    {
        KeepSceneRootStable();

        if (!initialized)
        {
            ResetToSpawn();
        }

        if (Input.GetKeyDown(KeyCode.Escape))
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        if (Cursor.lockState != CursorLockMode.Locked)
        {
            if (Input.GetMouseButtonDown(0))
            {
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
                ignoreInputForFrame = true;
            }

            return;
        }

        if (!TeacherFpsMockInput.IsGameplayWindowFocused())
        {
            return;
        }

        var game = TeacherFpsMockGame.Instance;
        if (game != null && game.IsTerminal)
        {
            return;
        }

        // The first mouse frame after the Game view receives focus can contain a
        // stale editor-to-game pointer delta. Ignore camera/movement for that
        // frame so focusing the view cannot teleport the teacher or shift the
        // classroom hierarchy. The click remains available to the game loop as
        // the chalk-fire input.
        if (ignoreInputForFrame || Time.realtimeSinceStartup < ignoreInputUntil || Input.GetMouseButtonDown(0))
        {
            ignoreInputForFrame = false;
            return;
        }

        UpdateLook();
        UpdateMovement();
    }

    private void UpdateLook()
    {
        var mouseX = Input.GetAxis("Mouse X") * lookSensitivity;
        var mouseY = Input.GetAxis("Mouse Y") * lookSensitivity;
        var keyboardYaw = 0.0f;
        var keyboardPitch = 0.0f;
        if (Input.GetKey(KeyCode.LeftArrow))
        {
            keyboardYaw -= 1.0f;
        }

        if (Input.GetKey(KeyCode.RightArrow))
        {
            keyboardYaw += 1.0f;
        }

        if (Input.GetKey(KeyCode.UpArrow))
        {
            keyboardPitch -= 1.0f;
        }

        if (Input.GetKey(KeyCode.DownArrow))
        {
            keyboardPitch += 1.0f;
        }

        yaw += mouseX + keyboardYaw * keyboardLookSpeed * Time.deltaTime;
        pitch = Mathf.Clamp(pitch - mouseY + keyboardPitch * keyboardLookSpeed * Time.deltaTime, minPitch, maxPitch);
        transform.rotation = Quaternion.Euler(pitch, yaw, 0.0f);
    }

    private void UpdateMovement()
    {
        var horizontal = Input.GetAxisRaw("Horizontal");
        var vertical = Input.GetAxisRaw("Vertical");
        var input = Vector3.ClampMagnitude(new Vector3(horizontal, 0.0f, vertical), 1.0f);
        var forward = Vector3.ProjectOnPlane(transform.forward, Vector3.up).normalized;
        var right = Vector3.ProjectOnPlane(transform.right, Vector3.up).normalized;
        var movement = forward * input.z + right * input.x;
        var speed = moveSpeed * (Input.GetKey(KeyCode.LeftShift) ? sprintMultiplier : 1.0f);
        var nextPosition = transform.position + movement * speed * Time.deltaTime;
        nextPosition.x = Mathf.Clamp(nextPosition.x, xBounds.x, xBounds.y);
        nextPosition.z = Mathf.Clamp(nextPosition.z, zBounds.x, zBounds.y);
        nextPosition.y = transform.position.y;

        var movementDelta = nextPosition - transform.position;
        if (characterController != null && characterController.enabled)
        {
            characterController.Move(movementDelta);
        }
        else
        {
            transform.position = nextPosition;
        }

        // コライダーで止めた後にも、教壇内のプレイ領域を最終保証する。
        var constrainedPosition = transform.position;
        constrainedPosition.x = Mathf.Clamp(constrainedPosition.x, xBounds.x, xBounds.y);
        constrainedPosition.y = spawnPosition.y;
        constrainedPosition.z = Mathf.Clamp(constrainedPosition.z, zBounds.x, zBounds.y);
        transform.position = constrainedPosition;
    }

    private void EnsureCharacterController()
    {
        characterController = GetComponent<CharacterController>();
        if (characterController == null)
        {
            characterController = gameObject.AddComponent<CharacterController>();
        }

        characterController.height = Mathf.Max(1.0f, controllerHeight);
        characterController.radius = Mathf.Clamp(controllerRadius, 0.05f, characterController.height * 0.49f);
        characterController.center = Vector3.down * (characterController.height * 0.5f);
        characterController.stepOffset = 0.0f;
        characterController.slopeLimit = 0.1f;
        characterController.skinWidth = 0.02f;
        characterController.minMoveDistance = 0.0f;
        characterController.detectCollisions = true;
    }

    public void ResetToSpawn()
    {
        CacheSceneRoot();
        var spawn = GameObject.Find("ClassroomRoot/TeacherSpawn");
        spawnPosition = spawn != null
            ? spawn.transform.position + Vector3.up * eyeHeight
            : new Vector3(0.0f, eyeHeight, -6.5f);

        if (characterController != null)
        {
            // CharacterControllerを一度再配置してから下向きに押し付け、
            // 教壇の天板(BoxCollider)を確実に接地面として認識させる。
            characterController.enabled = false;
            transform.position = spawnPosition;
            characterController.enabled = true;
            characterController.Move(Vector3.down * 0.10f);
        }
        else
        {
            transform.position = spawnPosition;
        }
        yaw = spawn == null ? 0.0f : spawn.transform.eulerAngles.y;
        // 少し見下ろし、振り返ったときに生徒の上半身と机上を確認できるようにする。
        pitch = 8.0f;
        transform.rotation = Quaternion.Euler(pitch, yaw, 0.0f);
        initialized = true;
        ignoreInputForFrame = true;
        ignoreInputUntil = Time.realtimeSinceStartup + 0.35f;
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    public void SetView(float targetYaw, float targetPitch)
    {
        yaw = targetYaw;
        pitch = Mathf.Clamp(targetPitch, minPitch, maxPitch);
        transform.rotation = Quaternion.Euler(pitch, yaw, 0.0f);
        initialized = true;
        ignoreInputForFrame = true;
        ignoreInputUntil = Time.realtimeSinceStartup + 0.35f;
    }

    private void CacheSceneRoot()
    {
        if (sceneRoot != null)
        {
            return;
        }

        sceneRoot = transform.parent;
        if (sceneRoot == null || sceneRoot == transform)
        {
            sceneRoot = null;
            return;
        }

        sceneRootPosition = sceneRoot.position;
        sceneRootRotation = sceneRoot.rotation;
        sceneRootScale = sceneRoot.localScale;
    }

    private void KeepSceneRootStable()
    {
        if (sceneRoot == null)
        {
            return;
        }

        if ((sceneRoot.position - sceneRootPosition).sqrMagnitude > 0.000001f
            || Quaternion.Angle(sceneRoot.rotation, sceneRootRotation) > 0.01f
            || (sceneRoot.localScale - sceneRootScale).sqrMagnitude > 0.000001f)
        {
            sceneRoot.SetPositionAndRotation(sceneRootPosition, sceneRootRotation);
            sceneRoot.localScale = sceneRootScale;
        }
    }

    private void OnDisable()
    {
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }
}

/// <summary>
/// 生徒の頭部をレティクル判定用の球として扱い、許可対象と時間窓を管理する。
/// </summary>
public sealed class TeacherStudentTarget : MonoBehaviour
{
    // 切り替えが速すぎて常時反応を要求されないよう、従来の10倍へ拡大する。
    internal const float CycleSeconds = 80.0f;
    internal const float ActiveWindowSeconds = 30.0f;

    [SerializeField] private Vector3 headOffset = new Vector3(0.0f, 1.55f, 0.0f);
    [SerializeField] private float hitRadius = 0.18f;
    [SerializeField] private float bodyHitRadius = 0.42f;

    private TeacherFpsMockGame game;
    private StudentAnimationDriver animationDriver;
    private Animator animator;
    private Transform hipsBone;
    private Transform spineBone;
    private Transform chestBone;
    private Transform headBone;
    private int studentIndex;
    private float phaseOffset;
    private int lastHitCycle = -1;
    private float understanding = 0.24f;
    private TeacherStudentActivityState lastActivityState = TeacherStudentActivityState.Hidden;

    public string DisplayName => gameObject.name;
    public bool IsAllowedTarget { get; private set; }
    public Vector3 BodyPosition
    {
        get
        {
            ResolveBones();
            if (chestBone != null)
            {
                return chestBone.position;
            }

            if (spineBone != null)
            {
                return spineBone.position;
            }

            var hipsPosition = hipsBone == null ? transform.position + Vector3.up * 0.55f : hipsBone.position;
            return Vector3.Lerp(hipsPosition, HeadPosition, 0.52f);
        }
    }
    public float BodyHitRadius => Mathf.Clamp(bodyHitRadius, 0.24f, 0.6f);
    public Vector3 HeadPosition
    {
        get
        {
            ResolveHeadBone();
            if (headBone == null)
            {
                // 起動直後にAnimatorの頭ボーン解決が一瞬遅れても、拡大後のモデルで
                // 暫定照準が机上まで跳ね上がらないよう、表示メッシュの上端から額付近を推定する。
                var renderers = GetComponentsInChildren<Renderer>(true);
                if (renderers.Length > 0)
                {
                    var bounds = renderers[0].bounds;
                    for (var i = 1; i < renderers.Length; i++)
                    {
                        bounds.Encapsulate(renderers[i].bounds);
                    }

                    var foreheadY = Mathf.Lerp(bounds.min.y, bounds.max.y, 0.86f);
                    return new Vector3(transform.position.x, foreheadY, transform.position.z)
                        + transform.forward * 0.065f;
                }

                return transform.position + transform.up * headOffset.y;
            }

            // Headボーン中心から上・正面へ少しだけ寄せ、髪ではなく額付近を狙える位置にする。
            return headBone.position + Vector3.up * 0.055f + transform.forward * 0.065f;
        }
    }
    public float Understanding => understanding;

    private void Awake()
    {
        ResolveBones();
    }

    private void ResolveHeadBone()
    {
        ResolveBones();
    }

    private void ResolveBones()
    {
        if (headBone != null && hipsBone != null)
        {
            return;
        }

        if (animator == null)
        {
            animator = GetComponentInChildren<Animator>(true);
        }

        if (animator != null)
        {
            hipsBone = animator.GetBoneTransform(HumanBodyBones.Hips);
            spineBone = animator.GetBoneTransform(HumanBodyBones.Spine);
            chestBone = animator.GetBoneTransform(HumanBodyBones.Chest);
            headBone = animator.GetBoneTransform(HumanBodyBones.Head);
        }

        if (headBone == null || hipsBone == null)
        {
            var bones = GetComponentsInChildren<Transform>(true);
            if (headBone == null)
            {
                headBone = bones.FirstOrDefault(bone => bone != null && bone.name.IndexOf("head", StringComparison.OrdinalIgnoreCase) >= 0);
            }
            if (hipsBone == null)
            {
                hipsBone = bones.FirstOrDefault(bone => bone != null && (bone.name.IndexOf("hips", StringComparison.OrdinalIgnoreCase) >= 0 || bone.name.IndexOf("pelvis", StringComparison.OrdinalIgnoreCase) >= 0));
            }
            if (spineBone == null)
            {
                spineBone = bones.FirstOrDefault(bone => bone != null && bone.name.IndexOf("spine", StringComparison.OrdinalIgnoreCase) >= 0);
            }
        }
    }

    public void Configure(TeacherFpsMockGame owner, StudentAnimationDriver driver, int index, bool isAllowedTarget, float phase)
    {
        game = owner;
        animationDriver = driver;
        studentIndex = index;
        IsAllowedTarget = isAllowedTarget;
        phaseOffset = phase;
        lastHitCycle = -1;
        understanding = 0.24f + (index % 3) * 0.04f;
        lastActivityState = TeacherStudentActivityState.Hidden;
    }

    public void Tick(float deltaTime, bool lessonIsAdvancing, float currentTime)
    {
        var activityState = GetActivityState(currentTime);
        if (activityState != lastActivityState)
        {
            if (animationDriver != null)
            {
                if (activityState == TeacherStudentActivityState.Sleeping)
                {
                    animationDriver.PlaySleeping();
                }
                else if (lastActivityState == TeacherStudentActivityState.Sleeping
                    && activityState != TeacherStudentActivityState.Hit)
                {
                    animationDriver.PlayIdle();
                }
            }

            lastActivityState = activityState;
        }

        if (!lessonIsAdvancing)
        {
            return;
        }

        // サボり中は理解度が停止し、通常時だけゆっくり増える。
        if (!IsDistractingAt(currentTime))
        {
            understanding = Mathf.Clamp01(understanding + deltaTime * 0.012f);
        }
    }

    public bool IsDistractingAt(float currentTime)
    {
        if (!IsAllowedTarget)
        {
            return false;
        }

        var cycle = Mathf.FloorToInt((currentTime + phaseOffset) / CycleSeconds);
        if (cycle == lastHitCycle)
        {
            return false;
        }

        var cycleTime = Mathf.Repeat(currentTime + phaseOffset, CycleSeconds);
        return cycleTime <= ActiveWindowSeconds;
    }

    public TeacherStudentActivityState GetActivityState(float currentTime)
    {
        if (!IsAllowedTarget)
        {
            return TeacherStudentActivityState.Hidden;
        }

        if (HasBeenHitInCurrentWindow(currentTime))
        {
            return TeacherStudentActivityState.Hit;
        }

        var cycleTime = Mathf.Repeat(currentTime + phaseOffset, CycleSeconds);
        if (cycleTime <= ActiveWindowSeconds * 0.5f)
        {
            return TeacherStudentActivityState.Sleeping;
        }

        if (cycleTime <= ActiveWindowSeconds)
        {
            return TeacherStudentActivityState.Fooling;
        }

        return TeacherStudentActivityState.Hidden;
    }

    public bool HasBeenHitInCurrentWindow(float currentTime)
    {
        if (!IsAllowedTarget)
        {
            return false;
        }

        var cycle = Mathf.FloorToInt((currentTime + phaseOffset) / CycleSeconds);
        return cycle == lastHitCycle;
    }

    public bool TryGetRayHit(Ray ray, float maxDistance, out float distance)
    {
        return TryGetRayHit(ray, maxDistance, out distance, out _);
    }

    public bool TryGetRayHit(Ray ray, float maxDistance, out float distance, out TeacherChalkHitZone hitZone)
    {
        hitZone = TeacherChalkHitZone.None;
        if (TryGetRaySphereHit(ray, HeadPosition, hitRadius, maxDistance, out distance))
        {
            hitZone = TeacherChalkHitZone.Head;
            return true;
        }

        if (TryGetRaySphereHit(ray, BodyPosition, BodyHitRadius, maxDistance, out distance))
        {
            hitZone = TeacherChalkHitZone.Body;
            return true;
        }

        distance = 0.0f;
        return false;
    }

    public bool TryGetSegmentHit(
        Vector3 start,
        Vector3 end,
        float projectileRadius,
        out float distance,
        out TeacherChalkHitZone hitZone,
        out Vector3 hitPosition)
    {
        distance = float.PositiveInfinity;
        hitZone = TeacherChalkHitZone.None;
        hitPosition = end;

        var expandedHeadRadius = Mathf.Max(0.01f, hitRadius + Mathf.Max(0.0f, projectileRadius));
        var expandedBodyRadius = Mathf.Max(0.01f, BodyHitRadius + Mathf.Max(0.0f, projectileRadius));
        var hasHit = TryGetSegmentSphereHit(start, end, HeadPosition, expandedHeadRadius, out var headDistance, out var headPosition);
        if (hasHit)
        {
            distance = headDistance;
            hitZone = TeacherChalkHitZone.Head;
            hitPosition = headPosition;
        }

        if (TryGetSegmentSphereHit(start, end, BodyPosition, expandedBodyRadius, out var bodyDistance, out var bodyPosition)
            && (!hasHit || bodyDistance < distance))
        {
            distance = bodyDistance;
            hitZone = TeacherChalkHitZone.Body;
            hitPosition = bodyPosition;
            hasHit = true;
        }

        return hasHit;
    }

    public Vector3 GetHitPosition(TeacherChalkHitZone hitZone)
    {
        return hitZone == TeacherChalkHitZone.Body ? BodyPosition : HeadPosition;
    }

    private static bool TryGetRaySphereHit(Ray ray, Vector3 center, float radius, float maxDistance, out float distance)
    {
        var toCenter = center - ray.origin;
        var alongRay = Vector3.Dot(toCenter, ray.direction);
        if (alongRay < 0.0f || alongRay > maxDistance)
        {
            distance = 0.0f;
            return false;
        }

        var closestPoint = ray.origin + ray.direction * alongRay;
        var perpendicularSqr = (closestPoint - center).sqrMagnitude;
        var radiusSqr = radius * radius;
        if (perpendicularSqr > radiusSqr)
        {
            distance = 0.0f;
            return false;
        }

        distance = Mathf.Max(0.0f, alongRay - Mathf.Sqrt(radiusSqr - perpendicularSqr));
        return distance <= maxDistance;
    }

    private static bool TryGetSegmentSphereHit(
        Vector3 start,
        Vector3 end,
        Vector3 center,
        float radius,
        out float distance,
        out Vector3 hitPosition)
    {
        var segment = end - start;
        var segmentLength = segment.magnitude;
        if (segmentLength < 0.0001f)
        {
            var inside = (start - center).sqrMagnitude <= radius * radius;
            distance = inside ? 0.0f : 0.0f;
            hitPosition = start;
            return inside;
        }

        var ray = new Ray(start, segment / segmentLength);
        if (!TryGetRaySphereHit(ray, center, radius, segmentLength, out distance))
        {
            hitPosition = end;
            return false;
        }

        hitPosition = start + ray.direction * distance;
        return true;
    }

    public void RegisterCorrectHit(float currentTime)
    {
        lastHitCycle = Mathf.FloorToInt((currentTime + phaseOffset) / CycleSeconds);
        lastActivityState = TeacherStudentActivityState.Hit;
        understanding = Mathf.Clamp01(understanding + 0.08f);
        if (animationDriver != null)
        {
            animationDriver.StruckInHead();
        }
    }

    public void ApplyTimingPenalty()
    {
        understanding = Mathf.Clamp01(understanding - 0.12f);
    }

    public void ApplyBodyHitPenalty()
    {
        understanding = Mathf.Clamp01(understanding - 0.06f);
    }

    public void ApplyWrongTargetPenalty()
    {
        understanding = Mathf.Clamp01(understanding - 0.18f);
    }

    public void ReactWrongShot()
    {
        lastActivityState = TeacherStudentActivityState.Hit;
        if (animationDriver != null)
        {
            animationDriver.ReactDisapproval();
        }
    }

    public void ReactBodyShot()
    {
        lastActivityState = TeacherStudentActivityState.Hit;
        if (animationDriver != null)
        {
            animationDriver.ReactBodyHit();
        }
    }

    public void ResetForRound()
    {
        lastHitCycle = -1;
        understanding = 0.24f + (studentIndex % 3) * 0.04f;
        lastActivityState = TeacherStudentActivityState.Hidden;
        if (animationDriver != null)
        {
            animationDriver.PlayIdle();
        }
    }

    public string GetStatusLabel(float currentTime)
    {
        if (!IsAllowedTarget)
        {
            return "真面目・対象外";
        }

        if (HasBeenHitInCurrentWindow(currentTime))
        {
            return "命中済み";
        }

        return IsDistractingAt(currentTime) ? "サボり中・命中可" : "タイミング待ち";
    }
}

/// <summary>
/// カメラ中央の予測軌道を共有し、重力を受けながら飛ぶチョーク。
/// Rigidbodyの反発には頼らず、最初の着弾で必ず砕ける。
/// </summary>
public sealed class TeacherChalkProjectile : MonoBehaviour
{
    private TeacherFpsMockGame game;
    private Vector3 launchPosition;
    private Vector3 initialVelocity;
    private Vector3 gravity;
    private float elapsed;
    private float flightTime;
    private float projectileRadius;
    private Material chalkMaterial;
    private bool impacted;
    private readonly RaycastHit[] environmentHits = new RaycastHit[32];

    public void Initialize(
        TeacherFpsMockGame owner,
        Vector3 origin,
        Vector3 velocity,
        Vector3 acceleration,
        float duration,
        float radius,
        Material material)
    {
        game = owner;
        launchPosition = origin;
        initialVelocity = velocity;
        gravity = acceleration;
        flightTime = Mathf.Max(0.05f, duration);
        projectileRadius = Mathf.Max(0.01f, radius);
        chalkMaterial = material;
        elapsed = 0.0f;
        impacted = false;
        transform.position = origin;
    }

    private void Update()
    {
        if (impacted || game == null)
        {
            Destroy(gameObject);
            return;
        }

        var previousPosition = transform.position;
        var nextTime = Mathf.Min(flightTime, elapsed + Mathf.Max(0.001f, Time.deltaTime));
        var nextPosition = EvaluatePosition(nextTime);
        var segment = nextPosition - previousPosition;
        var segmentLength = segment.magnitude;
        if (segmentLength > 0.0001f)
        {
            var direction = segment / segmentLength;
            var hasTarget = game.TryGetChalkTargetHit(
                previousPosition,
                nextPosition,
                projectileRadius,
                out var target,
                out var hitZone,
                out var targetPosition,
                out var targetDistance);
            var hasEnvironment = TryGetEnvironmentHit(
                previousPosition,
                direction,
                segmentLength,
                out var environmentHit,
                out var environmentDistance);

            if (hasTarget && (!hasEnvironment || targetDistance <= environmentDistance))
            {
                ImpactTarget(target, hitZone, targetPosition, nextTime);
                return;
            }

            if (hasEnvironment)
            {
                ImpactEnvironment(environmentHit.point, environmentHit.normal, nextTime);
                return;
            }
        }

        transform.position = nextPosition;
        var currentVelocity = initialVelocity + gravity * nextTime;
        if (currentVelocity.sqrMagnitude > 0.0001f)
        {
            transform.rotation = Quaternion.FromToRotation(Vector3.up, currentVelocity.normalized);
        }

        elapsed = nextTime;
        if (elapsed >= flightTime - 0.0001f)
        {
            ImpactEnvironment(nextPosition, Vector3.up, nextTime);
        }
    }

    private Vector3 EvaluatePosition(float time)
    {
        return launchPosition + initialVelocity * time + 0.5f * gravity * time * time;
    }

    private bool TryGetEnvironmentHit(
        Vector3 start,
        Vector3 direction,
        float distance,
        out RaycastHit nearestHit,
        out float nearestDistance)
    {
        nearestHit = default;
        nearestDistance = float.PositiveInfinity;
        var hitCount = Physics.SphereCastNonAlloc(
            start,
            projectileRadius,
            direction,
            environmentHits,
            distance,
            Physics.DefaultRaycastLayers,
            QueryTriggerInteraction.Ignore);
        var found = false;
        for (var i = 0; i < hitCount; i++)
        {
            var hit = environmentHits[i];
            if (hit.collider == null
                || TeacherFpsMockGame.ShouldIgnoreChalkCollider(hit.collider)
                || hit.distance >= nearestDistance)
            {
                continue;
            }

            nearestHit = hit;
            nearestDistance = hit.distance;
            found = true;
        }

        return found;
    }

    private void ImpactTarget(TeacherStudentTarget target, TeacherChalkHitZone hitZone, Vector3 position, float impactTime)
    {
        if (impacted)
        {
            return;
        }

        impacted = true;
        var incomingVelocity = initialVelocity + gravity * impactTime;
        TeacherChalkShatter.Spawn(position, incomingVelocity, Vector3.up, projectileRadius, chalkMaterial);
        Debug.Log($"[TEACHER] Chalk impact: target={target.DisplayName}, zone={hitZone}, position={position}");
        game.ResolveProjectileImpact(target, hitZone, position);
        Destroy(gameObject);
    }

    private void ImpactEnvironment(Vector3 position, Vector3 normal, float impactTime)
    {
        if (impacted)
        {
            return;
        }

        impacted = true;
        var incomingVelocity = initialVelocity + gravity * impactTime;
        TeacherChalkShatter.Spawn(position, incomingVelocity, normal, projectileRadius, chalkMaterial);
        Debug.Log($"[TEACHER] Chalk impact: environment, position={position}, normal={normal}");
        game.ResolveProjectileEnvironmentImpact(position, normal);
        Destroy(gameObject);
    }
}

internal static class TeacherChalkShatter
{
    public static void Spawn(
        Vector3 position,
        Vector3 incomingVelocity,
        Vector3 normal,
        float radius,
        Material material)
    {
        var safeNormal = normal.sqrMagnitude > 0.0001f ? normal.normalized : Vector3.up;
        var forward = incomingVelocity.sqrMagnitude > 0.0001f ? incomingVelocity.normalized : safeNormal;
        var fragmentRadius = Mathf.Max(0.012f, radius * 0.35f);

        for (var i = 0; i < 5; i++)
        {
            var fragment = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            fragment.name = "ChalkFragment_Runtime";
            var collider = fragment.GetComponent<Collider>();
            if (collider != null)
            {
                UnityEngine.Object.Destroy(collider);
            }

            var fragmentDirection = (safeNormal * 0.55f + forward * 0.35f + UnityEngine.Random.insideUnitSphere * 0.75f).normalized;
            if (fragmentDirection.sqrMagnitude < 0.0001f)
            {
                fragmentDirection = safeNormal;
            }

            fragment.transform.SetPositionAndRotation(
                position,
                Quaternion.FromToRotation(Vector3.up, fragmentDirection));
            fragment.transform.localScale = new Vector3(fragmentRadius, radius * 0.9f, fragmentRadius);

            var renderer = fragment.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = material;
            }

            var fragmentVelocity = fragmentDirection * (1.0f + UnityEngine.Random.value * 1.2f) + incomingVelocity * 0.06f;
            fragment.AddComponent<TeacherChalkFragment>().Initialize(fragmentVelocity, 0.45f);
        }
    }
}

internal sealed class TeacherChalkFragment : MonoBehaviour
{
    private Vector3 velocity;
    private Vector3 angularVelocity;
    private float lifetime;

    public void Initialize(Vector3 initialVelocity, float duration)
    {
        velocity = initialVelocity;
        angularVelocity = UnityEngine.Random.insideUnitSphere * 420.0f;
        lifetime = Mathf.Max(0.05f, duration);
    }

    private void Update()
    {
        var deltaTime = Time.deltaTime;
        transform.position += velocity * deltaTime;
        velocity += Vector3.down * 7.0f * deltaTime;
        transform.Rotate(angularVelocity * deltaTime, Space.Self);
        lifetime -= deltaTime;
        if (lifetime <= 0.0f)
        {
            Destroy(gameObject);
        }
    }
}
