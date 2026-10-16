using System;
using UniVRM10;
using UnityEngine;
using UnityEngine.Rendering;

[DisallowMultipleComponent]
public sealed class StudentAnimationDriver : MonoBehaviour
{
    [SerializeField] private Animator animator;
    [SerializeField] private string idleState = "SittingIdle";
    [SerializeField] private bool playIdleOnEnable = true;

    [Header("個体差")]
    [Range(0.8f, 1.2f)]
    [SerializeField] private float motionSpeed = 1.0f;

    [Header("着座を安定させる設定")]
    [SerializeField] private bool keepRootSeated = true;
    [SerializeField] private Transform seatAnchor;
    [SerializeField] private float seatHipClearance = 0.22f;
    [SerializeField] private float floorHeight = 0.02f;
    [SerializeField] private bool keepFeetOnFloor = true;
    [SerializeField] private bool alwaysAnimateWhenDistant = true;
    [SerializeField] private bool applyToonCharacterPresentation = true;

    [Header("睡眠演出")]
    [SerializeField] private string sleepAnimationState = "SittingDisbelief";
    [Range(0.1f, 0.95f)]
    [SerializeField] private float sleepLoopNormalizedEnd = 0.5f;
    [SerializeField] private bool closeEyesWhileSleeping = true;
    [Range(0.0f, 1.0f)]
    [SerializeField] private float closedEyeWeight = 1.0f;

    private Vector3 seatedWorldPosition;
    private Quaternion seatedWorldRotation;
    private bool seatedRootCaptured;
    private bool presentationConfigured;
    private Renderer[] seatingRenderers = Array.Empty<Renderer>();
    private Vrm10Instance vrmInstance;
    private bool sleeping;
    private float sleepElapsed;
    private float sleepClipLength = 1.0f;
    private int sleepStateHash;
    private float animatorSpeedBeforeSleep = 1.0f;
    private bool animatorSpeedCaptured;
    private bool eyesClosed;
    private bool eyesClosedApplied;
    private bool sleepStateWarningLogged;

    public float MotionSpeed => motionSpeed;

    private void Awake()
    {
        ResolveAnimator();
        ConfigurePresentation();
    }

    private void OnEnable()
    {
        ResolveAnimator();
        ApplyMotionSpeed();
        // 起動直後はまだHumanoidクリップが評価されていないため、ここでルートを固定しない。
        // Startで座りポーズを1フレーム評価してから、椅子へ再配置する。
        seatedRootCaptured = false;
        ConfigurePresentation();
        if (playIdleOnEnable)
        {
            PlayState(idleState, 0.0f);
        }
    }

    private void Start()
    {
        ResolveAnimator();
        ConfigurePresentation();
        ApplyMotionSpeed();

        if (animator != null && animator.isActiveAndEnabled && animator.runtimeAnimatorController != null)
        {
            // VRMのAnimator Controllerが有効になった後に、座りアイドルを確実に評価する。
            animator.Rebind();
            animator.Update(0.0f);
        }

        if (playIdleOnEnable)
        {
            PlayState(idleState, 0.0f);
            if (animator != null && animator.isActiveAndEnabled)
            {
                animator.Update(0.0f);
            }
        }

        // Humanoidの各FBXは同じ「座り」でも腰の初期位置が異なるため、
        // 再生開始時に評価済みの腰を椅子の座面より少し上へ3軸で合わせる。
        // その後、表示 bounds の最下点を床へ合わせることで、Mixamoクリップの
        // ルート高さの違いによる「足が床へ沈む」「尻が座面へ埋まる」を防ぐ。
        AlignHipsToSeat();
        CaptureSeatedRoot();
    }

    private void OnDisable()
    {
        StopSleepingPlayback();
    }

    private void Update()
    {
        // Animatorの通常評価より前に次の正規化時間を指定し、既存FBXの前半をループする。
        ApplySleepingPlayback();
    }

    private void LateUpdate()
    {
        if (keepRootSeated && seatedRootCaptured)
        {
            // クリップ側のRoot MotionやVRMの初期化で、モデル本体が机からずれないようにする。
            if ((transform.position - seatedWorldPosition).sqrMagnitude > 0.000001f
                || Quaternion.Angle(transform.rotation, seatedWorldRotation) > 0.01f)
            {
                transform.SetPositionAndRotation(seatedWorldPosition, seatedWorldRotation);
            }

            // リアクション用の別クリップへ遷移した場合も、座位の足元を再確認する。
            // 座位キャラクターのrootだけを補正し、骨そのものはHumanoidへ任せる。
            if (keepFeetOnFloor)
            {
                var verticalCorrection = CalculateSeatedVerticalCorrection();
                if (Mathf.Abs(verticalCorrection) > 0.0005f)
                {
                    transform.position += Vector3.up * verticalCorrection;
                    seatedWorldPosition = transform.position;
                }
            }
        }

    }

    public void SetIdleVariant(int variant)
    {
        idleState = variant switch
        {
            1 => "SittingIdleAlt1",
            2 => "SittingIdleAlt2",
            _ => "SittingIdle"
        };

        PlayState(idleState, 0.12f);
    }

    public void SetMotionSpeed(float speed)
    {
        motionSpeed = Mathf.Clamp(speed, 0.8f, 1.2f);
        ApplyMotionSpeed();
    }

    public void SetSeatAnchor(Transform anchor)
    {
        seatAnchor = anchor;
    }

    public void PlayIdle()
    {
        PlayState(idleState, 0.12f);
    }

    public void PlaySleeping()
    {
        ResolveAnimator();
        if (animator == null || !animator.isActiveAndEnabled || animator.runtimeAnimatorController == null)
        {
            return;
        }

        var stateHash = Animator.StringToHash(sleepAnimationState);
        if (!animator.HasState(0, stateHash))
        {
            if (!sleepStateWarningLogged)
            {
                Debug.LogWarning($"[TEACHER] StudentAnimationDriver could not find sleep state '{sleepAnimationState}' on '{name}'.");
                sleepStateWarningLogged = true;
            }

            return;
        }

        if (!sleeping || sleepStateHash != stateHash)
        {
            StopSleepingPlayback();
            sleeping = true;
            sleepElapsed = 0.0f;
            sleepStateHash = stateHash;
            animatorSpeedBeforeSleep = animator.speed;
            animatorSpeedCaptured = true;
            animator.Play(sleepStateHash, 0, 0.0f);
            animator.Update(0.0f);
            var stateInfo = animator.GetCurrentAnimatorStateInfo(0);
            sleepClipLength = IsFinite(stateInfo.length) && stateInfo.length > 0.01f
                ? stateInfo.length
                : 1.0f;
            animator.speed = 0.0f;
        }

        if (closeEyesWhileSleeping)
        {
            SetEyesClosed(true);
        }
    }

    public void PlayTalking()
    {
        SetTrigger("Talk");
    }

    public void PlayClap()
    {
        SetTrigger("Clap");
    }

    public void ReactAngry()
    {
        SetTrigger("Angry");
    }

    public void ReactDisapproval()
    {
        SetTrigger("Disapproval");
    }

    public void ReactBodyHit()
    {
        // 額ではない身体への着弾は、頭部命中とは別の驚きリアクションにする。
        SetTrigger("Disbelief");
    }

    public void ReactDisbelief()
    {
        SetTrigger("Disbelief");
    }

    public void DodgeChalk()
    {
        SetTrigger("Dodge");
    }

    public void StruckInHead()
    {
        SetTrigger("StruckInHead");
    }

    private void ResolveAnimator()
    {
        if (animator == null)
        {
            // AnimatorがVRMルート直下ではなく、子のモデルルートにある構成にも対応する。
            animator = GetComponentInChildren<Animator>(true);
        }
    }

    private void ResolveVrmInstance()
    {
        if (vrmInstance == null)
        {
            vrmInstance = GetComponentInChildren<Vrm10Instance>(true);
        }
    }

    private void SetEyesClosed(bool closed)
    {
        eyesClosed = closed;
        ResolveVrmInstance();
        if (vrmInstance == null)
        {
            return;
        }

        var runtime = vrmInstance.Runtime;
        if (runtime == null || runtime.Expression == null)
        {
            return;
        }

        if (eyesClosedApplied == closed)
        {
            return;
        }

        runtime.Expression.SetWeight(ExpressionKey.Blink, closed ? Mathf.Clamp01(closedEyeWeight) : 0.0f);
        eyesClosedApplied = closed;
    }

    private void StopSleepingPlayback()
    {
        if (!sleeping && !eyesClosed && !animatorSpeedCaptured)
        {
            return;
        }

        sleeping = false;
        if (animatorSpeedCaptured && animator != null)
        {
            animator.speed = animatorSpeedBeforeSleep;
        }

        animatorSpeedCaptured = false;
        SetEyesClosed(false);
    }

    private void ApplySleepingPlayback()
    {
        if (!sleeping)
        {
            return;
        }

        ResolveAnimator();
        if (animator == null || !animator.isActiveAndEnabled || animator.runtimeAnimatorController == null
            || !animator.HasState(0, sleepStateHash))
        {
            return;
        }

        // Animator自体は停止し、既存のHumanoidクリップの前半だけを再評価する。
        // これによりFBXのリターゲット結果を維持したまま、寝姿勢を安定してループできる。
        var fullClipLength = IsFinite(sleepClipLength) && sleepClipLength > 0.01f
            ? sleepClipLength
            : 1.0f;
        var loopDuration = Mathf.Max(0.1f, fullClipLength * Mathf.Clamp(sleepLoopNormalizedEnd, 0.1f, 0.95f));
        // 睡眠モーションも生徒ごとの再生速度を反映し、同じタイミングでも
        // 全員が同じ動きにならないようにする。
        sleepElapsed += Time.deltaTime * motionSpeed;
        var normalizedTime = Mathf.Repeat(sleepElapsed, loopDuration) / fullClipLength;
        if (!IsFinite(normalizedTime))
        {
            normalizedTime = 0.0f;
        }
        animator.speed = 0.0f;
        animator.Play(sleepStateHash, 0, normalizedTime);

        if (closeEyesWhileSleeping)
        {
            SetEyesClosed(true);
        }
    }

    private static bool IsFinite(float value)
    {
        return !float.IsNaN(value) && !float.IsInfinity(value);
    }

    private void ApplyMotionSpeed()
    {
        ResolveAnimator();
        if (animator != null && !sleeping)
        {
            animator.speed = Mathf.Clamp(motionSpeed, 0.8f, 1.2f);
        }
    }

    private void CaptureSeatedRoot()
    {
        if (seatedRootCaptured)
        {
            return;
        }

        seatedWorldPosition = transform.position;
        seatedWorldRotation = transform.rotation;
        seatedRootCaptured = true;
    }

    private void AlignHipsToSeat()
    {
        if (!keepRootSeated || seatAnchor == null)
        {
            return;
        }

        ResolveAnimator();
        var hips = animator == null ? null : animator.GetBoneTransform(HumanBodyBones.Hips);
        if (hips == null)
        {
            return;
        }

        var targetHips = seatAnchor.position + Vector3.up * Mathf.Max(0.0f, seatHipClearance);
        var seatingDelta = targetHips - hips.position;
        transform.position += seatingDelta;

        ApplyFloorAndHipCorrection();

        seatedWorldPosition = transform.position;
        seatedWorldRotation = transform.rotation;
        seatedRootCaptured = true;
    }

    private float CalculateSeatedVerticalCorrection()
    {
        var lowestVisibleY = GetLowestVisibleY();
        if (float.IsNaN(lowestVisibleY) || float.IsInfinity(lowestVisibleY))
        {
            return 0.0f;
        }

        var correction = floorHeight - lowestVisibleY;
        ResolveAnimator();
        var hips = animator == null ? null : animator.GetBoneTransform(HumanBodyBones.Hips);
        if (seatAnchor != null && hips != null)
        {
            var minimumHipsY = seatAnchor.position.y + Mathf.Max(0.0f, seatHipClearance);
            var correctedHipsY = hips.position.y + correction;
            if (correctedHipsY < minimumHipsY)
            {
                correction += minimumHipsY - correctedHipsY;
            }
        }

        return correction;
    }

    private void ApplyFloorAndHipCorrection()
    {
        if (!keepFeetOnFloor)
        {
            return;
        }

        var correction = CalculateSeatedVerticalCorrection();
        if (Mathf.Abs(correction) > 0.0005f)
        {
            transform.position += Vector3.up * correction;
        }
    }

    private float GetLowestVisibleY()
    {
        if (seatingRenderers == null || seatingRenderers.Length == 0)
        {
            seatingRenderers = GetComponentsInChildren<Renderer>(true);
        }

        var lowestY = float.PositiveInfinity;
        for (var i = 0; i < seatingRenderers.Length; i++)
        {
            var renderer = seatingRenderers[i];
            if (renderer == null || !renderer.enabled)
            {
                continue;
            }

            lowestY = Mathf.Min(lowestY, renderer.bounds.min.y);
        }

        return lowestY;
    }

    private void ConfigurePresentation()
    {
        if (presentationConfigured)
        {
            return;
        }

        ResolveAnimator();
        if (animator != null)
        {
            animator.applyRootMotion = false;
            if (alwaysAnimateWhenDistant)
            {
                animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            }
            animator.updateMode = AnimatorUpdateMode.Normal;
        }

        seatingRenderers = GetComponentsInChildren<Renderer>(true);
        for (var i = 0; i < seatingRenderers.Length; i++)
        {
            var renderer = seatingRenderers[i] as SkinnedMeshRenderer;
            if (renderer == null)
            {
                continue;
            }

            renderer.updateWhenOffscreen = true;
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.receiveShadows = true;

            if (applyToonCharacterPresentation)
            {
                ApplyMtoonPresentation(renderer);
            }
        }

        presentationConfigured = true;
    }

    private static void ApplyMtoonPresentation(SkinnedMeshRenderer renderer)
    {
        // renderer.materialsは学生ごとのランタイムインスタンスを返すため、元VRMのテクスチャを壊さない。
        var materials = renderer.materials;
        for (var i = 0; i < materials.Length; i++)
        {
            var material = materials[i];
            if (material == null || material.shader == null
                || material.shader.name.IndexOf("MToon", StringComparison.OrdinalIgnoreCase) < 0)
            {
                continue;
            }

            var isFace = material.name.IndexOf("FACE", StringComparison.OrdinalIgnoreCase) >= 0
                || material.name.IndexOf("Face", StringComparison.OrdinalIgnoreCase) >= 0;

            if (material.HasProperty("_EmissionColor"))
            {
                // VRMのemissiveFactorが白で取り込まれていたため、顔テクスチャが白飛びしていた。
                material.SetColor("_EmissionColor", Color.black);
            }
            if (material.HasProperty("_ShadingToonyFactor"))
            {
                material.SetFloat("_ShadingToonyFactor", isFace ? 0.78f : 0.82f);
            }
            if (material.HasProperty("_GiEqualization"))
            {
                material.SetFloat("_GiEqualization", 0.42f);
            }
            if (material.HasProperty("_RimLightingMix"))
            {
                material.SetFloat("_RimLightingMix", 0.0f);
            }
            if (material.HasProperty("_RimLift"))
            {
                material.SetFloat("_RimLift", 0.0f);
            }
            if (material.HasProperty("_RimColor"))
            {
                material.SetColor("_RimColor", Color.black);
            }
            if (material.HasProperty("_M_AlphaToMask"))
            {
                // Alpha-to-coverageは距離やアンチエイリアス設定で顔の輪郭が欠けやすいため無効化。
                material.SetFloat("_M_AlphaToMask", 0.0f);
            }
            if (material.HasProperty("_OutlineLightingMix"))
            {
                material.SetFloat("_OutlineLightingMix", 0.0f);
            }
            if (material.HasProperty("_OutlineWidth"))
            {
                material.SetFloat("_OutlineWidth", isFace ? 0.0035f : 0.0045f);
            }

            material.DisableKeyword("_MTOON_EMISSIVEMAP");
            material.DisableKeyword("_MTOON_RIMMAP");
        }
    }

    private void SetTrigger(string parameterName)
    {
        StopSleepingPlayback();
        ResolveAnimator();
        if (animator != null && animator.isActiveAndEnabled && animator.runtimeAnimatorController != null)
        {
            animator.ResetTrigger(parameterName);
            animator.SetTrigger(parameterName);
        }
    }

    private void PlayState(string stateName, float transitionDuration)
    {
        StopSleepingPlayback();
        ResolveAnimator();
        if (animator == null || !animator.isActiveAndEnabled || animator.runtimeAnimatorController == null)
        {
            return;
        }

        var stateHash = Animator.StringToHash(stateName);
        if (!animator.HasState(0, stateHash))
        {
            Debug.LogWarning($"[TEACHER] StudentAnimationDriver could not find state '{stateName}' on '{name}'.");
            return;
        }

        if (transitionDuration <= 0.0f)
        {
            animator.Play(stateHash, 0, 0.0f);
        }
        else
        {
            animator.CrossFadeInFixedTime(stateHash, transitionDuration, 0, 0.0f);
        }
    }
}
