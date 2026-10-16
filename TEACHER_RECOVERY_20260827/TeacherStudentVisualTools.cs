#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

/// <summary>
/// 生徒の着座位置・表示 bounds・Animator・VRM マテリアルを、シーン上の実データから確認するための工具。
/// 診断は読み取り専用、正規化はシーンの生徒インスタンスだけを対象にする。
/// </summary>
public static class TeacherStudentVisualTools
{
    private const string StudentsPath = "ClassroomRoot/Students";
    private const string ClassroomPath = "ClassroomRoot/AnimeClassroom";
    private const string ToonMaterialRoot = "Assets/Art/Characters/SGIRL01/Variants/Materials/Toon";

    [MenuItem("Teacher/Report Student Visual Diagnostics")]
    public static void ReportStudentVisualDiagnostics()
    {
        var studentsRoot = GameObject.Find(StudentsPath);
        var classroom = GameObject.Find(ClassroomPath);
        if (studentsRoot == null || classroom == null)
        {
            Debug.LogError("[TEACHER][DIAG] ClassroomRoot/Students or ClassroomRoot/AnimeClassroom was not found.");
            return;
        }

        var drivers = studentsRoot.GetComponentsInChildren<StudentAnimationDriver>(true)
            .OrderBy(driver => driver.name, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var chairs = GetDirectChildren(classroom.transform, "desk_chair")
            .OrderBy(GetIndexedName)
            .ToList();
        var desks = GetDirectChildren(classroom.transform, "desk")
            .OrderBy(GetIndexedName)
            .ToList();

        Debug.Log($"[TEACHER][DIAG] students={drivers.Count}, chairs={chairs.Count}, desks={desks.Count}, scene={studentsRoot.scene.name}");
        for (var i = 0; i < Math.Min(8, desks.Count); i++)
        {
            var deskBounds = CalculateBounds(desks[i].GetComponentsInChildren<Renderer>(true));
            Debug.Log($"[TEACHER][DIAG] DESK{i + 1} name={desks[i].name} pos={desks[i].position} boundsCenter={deskBounds.center} boundsSize={deskBounds.size} min={deskBounds.min} max={deskBounds.max}");
        }
        for (var i = 0; i < drivers.Count; i++)
        {
            var driver = drivers[i];
            var animator = driver.GetComponentInChildren<Animator>(true);
            var renderers = driver.GetComponentsInChildren<Renderer>(true);
            var bounds = CalculateBounds(renderers);
            var chair = i < chairs.Count ? chairs[i] : null;
            var chairBounds = chair == null ? new Bounds() : CalculateBounds(chair.GetComponentsInChildren<Renderer>(true));
            var head = animator == null ? null : animator.GetBoneTransform(HumanBodyBones.Head);
            var hips = animator == null ? null : animator.GetBoneTransform(HumanBodyBones.Hips);
            var leftFoot = animator == null ? null : animator.GetBoneTransform(HumanBodyBones.LeftFoot);
            var rightFoot = animator == null ? null : animator.GetBoneTransform(HumanBodyBones.RightFoot);
            var lowestFootY = GetLowestBoneY(leftFoot, rightFoot);
            var controllerName = animator == null || animator.runtimeAnimatorController == null
                ? "<none>"
                : animator.runtimeAnimatorController.name;

            Debug.Log($"[TEACHER][DIAG] S{i + 1} name={driver.name} active={driver.gameObject.activeInHierarchy} rootPos={driver.transform.position} scale={driver.transform.lossyScale} chairPos={(chair == null ? Vector3.zero : chair.position)} chairBoundsCenter={chairBounds.center} chairBoundsSize={chairBounds.size} visualBoundsMin={bounds.min} visualBoundsMax={bounds.max} visualBoundsSize={bounds.size} lowestFootY={lowestFootY:F3} hips={(hips == null ? Vector3.zero : hips.position)} head={(head == null ? Vector3.zero : head.position)} animator={(animator == null ? "<none>" : animator.name)} controller={controllerName} enabled={(animator != null && animator.isActiveAndEnabled)}");

            var materialKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var renderer in renderers)
            {
                if (renderer == null)
                {
                    continue;
                }

                foreach (var material in renderer.sharedMaterials)
                {
                    if (material == null)
                    {
                        continue;
                    }

                    var key = material.name + "|" + (material.shader == null ? "<none>" : material.shader.name);
                    if (!materialKeys.Add(key))
                    {
                        continue;
                    }

                    var mainTexture = material.mainTexture == null ? "<none>" : material.mainTexture.name;
                    var emission = material.HasProperty("_EmissionColor") ? material.GetColor("_EmissionColor").ToString() : "<n/a>";
                    Debug.Log($"[TEACHER][DIAG] S{i + 1} renderer={renderer.name} material={material.name} shader={(material.shader == null ? "<none>" : material.shader.name)} mainTex={mainTexture} emission={emission} cast={renderer.shadowCastingMode} receive={renderer.receiveShadows}");
                }
            }
        }
    }

    [MenuItem("Teacher/Normalize Student Visuals")]
    public static void NormalizeStudentVisuals()
    {
        var studentsRoot = GameObject.Find(StudentsPath);
        if (studentsRoot == null)
        {
            Debug.LogError("[TEACHER] ClassroomRoot/Students was not found.");
            return;
        }

        var drivers = studentsRoot.GetComponentsInChildren<StudentAnimationDriver>(true);
        var rendererCount = 0;
        var animatorCount = 0;
        var materialCount = 0;
        var materialCache = new Dictionary<string, Material>(StringComparer.OrdinalIgnoreCase);
        foreach (var driver in drivers)
        {
            if (driver == null)
            {
                continue;
            }

            var animator = driver.GetComponentInChildren<Animator>(true);
            if (animator != null)
            {
                Undo.RecordObject(animator, "Normalize Student Animator");
                animator.applyRootMotion = false;
                animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                animator.updateMode = AnimatorUpdateMode.Normal;
                EditorUtility.SetDirty(animator);
                PrefabUtility.RecordPrefabInstancePropertyModifications(animator);
                animatorCount++;
            }

            foreach (var renderer in driver.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                if (renderer == null)
                {
                    continue;
                }

                Undo.RecordObject(renderer, "Normalize Student Skinned Renderer");
                renderer.updateWhenOffscreen = true;
                renderer.shadowCastingMode = ShadowCastingMode.On;
                renderer.receiveShadows = true;
                materialCount += ApplyStudentMtoonPresentation(renderer, materialCache);
                EditorUtility.SetDirty(renderer);
                PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
                rendererCount++;
            }
        }

        EditorSceneManager.MarkSceneDirty(studentsRoot.scene);
        EditorSceneManager.SaveScene(studentsRoot.scene);
        AssetDatabase.SaveAssets();
        Debug.Log($"[TEACHER] Student visuals normalized: students={drivers.Length}, animators={animatorCount}, skinnedRenderers={rendererCount}, toonMaterials={materialCount}, offscreenAnimation=AlwaysAnimate");
    }

    [MenuItem("Teacher/Playtest View/Look at Students")]
    public static void SetPlaytestViewAtStudents()
    {
        var camera = GameObject.Find("ClassroomRoot/Main Camera");
        var controller = camera == null ? null : camera.GetComponent<TeacherFpsController>();
        if (controller == null)
        {
            Debug.LogWarning("[TEACHER] Playtest view requires the FPS camera to be in Play mode.");
            return;
        }

        // 2.20mの教師視点から、実際の額ボーンへレティクルを合わせる。
        // 固定角では机上へ照準が落ちる場合があるため、プレイテスト時だけ対象の頭部から逆算する。
        var targetObject = GameObject.Find("ClassroomRoot/Students/Student_03_Variant_C");
        var target = targetObject == null ? null : targetObject.GetComponent<TeacherStudentTarget>();
        if (target != null && camera != null)
        {
            var direction = target.HeadPosition - camera.transform.position;
            if (direction.sqrMagnitude > 0.0001f)
            {
                var normalized = direction.normalized;
                var yaw = Mathf.Atan2(normalized.x, normalized.z) * Mathf.Rad2Deg;
                var pitch = -Mathf.Asin(Mathf.Clamp(normalized.y, -1.0f, 1.0f)) * Mathf.Rad2Deg;
                controller.SetView(yaw, pitch);
                Debug.Log($"[TEACHER] Playtest camera view set to {target.DisplayName} forehead: yaw={yaw:F1}, pitch={pitch:F1}.");
                return;
            }
        }

        // 対象がまだ生成されていない場合のフォールバック。
        controller.SetView(170.0f, 8.0f);
        Debug.Log("[TEACHER] Playtest camera view set to the seated students.");
    }

    [MenuItem("Teacher/Playtest/Fire Ballistic Chalk")]
    public static void FireBallisticChalk()
    {
        var classroomRoot = GameObject.Find("ClassroomRoot");
        var game = classroomRoot == null ? null : classroomRoot.GetComponent<TeacherFpsMockGame>();
        if (game == null)
        {
            Debug.LogWarning("[TEACHER] Ballistic chalk playtest requires the FPS mock to be running in Play Mode.");
            return;
        }

        game.PlaytestFireChalk();
        Debug.Log("[TEACHER] Ballistic chalk playtest shot requested.");
    }

    private static int ApplyStudentMtoonPresentation(SkinnedMeshRenderer renderer, IDictionary<string, Material> materialCache)
    {
        var materials = renderer.sharedMaterials;
        var changed = false;
        var changedCount = 0;
        for (var i = 0; i < materials.Length; i++)
        {
            var source = materials[i];
            if (source == null || source.shader == null
                || source.shader.name.IndexOf("MToon", StringComparison.OrdinalIgnoreCase) < 0)
            {
                continue;
            }

            var cacheKey = source.name + "|" + (source.mainTexture == null ? "<none>" : source.mainTexture.name);
            if (AssetDatabase.Contains(source))
            {
                if (!materialCache.TryGetValue(cacheKey, out var clone) || clone == null)
                {
                    EnsureFolder(ToonMaterialRoot);
                    var fileName = "Teacher_" + SanitizeFileName(cacheKey) + ".mat";
                    var path = ToonMaterialRoot + "/" + fileName;
                    clone = AssetDatabase.LoadAssetAtPath<Material>(path);
                    if (clone == null)
                    {
                        clone = new Material(source)
                        {
                            name = System.IO.Path.GetFileNameWithoutExtension(fileName)
                        };
                        AssetDatabase.CreateAsset(clone, path);
                    }

                    materialCache[cacheKey] = clone;
                }

                if (materials[i] != clone)
                {
                    materials[i] = clone;
                    changed = true;
                }
            }

            var material = materials[i];
            ApplyMtoonValues(material);
            EditorUtility.SetDirty(material);
            changedCount++;
        }

        if (changed)
        {
            Undo.RecordObject(renderer, "Assign Student Toon Materials");
            renderer.sharedMaterials = materials;
            PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
        }

        return changedCount;
    }

    private static void ApplyMtoonValues(Material material)
    {
        if (material == null)
        {
            return;
        }

        var isFace = material.name.IndexOf("FACE", StringComparison.OrdinalIgnoreCase) >= 0
            || material.name.IndexOf("Face", StringComparison.OrdinalIgnoreCase) >= 0;
        if (material.HasProperty("_EmissionColor"))
        {
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

    private static List<Transform> GetDirectChildren(Transform parent, string prefix)
    {
        return parent.Cast<Transform>()
            .Where(child => child.name.Equals(prefix, StringComparison.OrdinalIgnoreCase) || child.name.StartsWith(prefix + ".", StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    private static int GetIndexedName(Transform child)
    {
        if (child == null)
        {
            return int.MaxValue;
        }

        var dot = child.name.LastIndexOf('.');
        if (dot < 0 || !int.TryParse(child.name.Substring(dot + 1), out var suffix))
        {
            return 0;
        }

        return suffix + 1;
    }

    private static Bounds CalculateBounds(IReadOnlyList<Renderer> renderers)
    {
        var hasBounds = false;
        var bounds = new Bounds();
        for (var i = 0; i < renderers.Count; i++)
        {
            var renderer = renderers[i];
            if (renderer == null)
            {
                continue;
            }

            if (!hasBounds)
            {
                bounds = renderer.bounds;
                hasBounds = true;
            }
            else
            {
                bounds.Encapsulate(renderer.bounds);
            }
        }

        return bounds;
    }

    private static float GetLowestBoneY(Transform leftFoot, Transform rightFoot)
    {
        var lowest = float.PositiveInfinity;
        if (leftFoot != null)
        {
            lowest = Mathf.Min(lowest, leftFoot.position.y);
        }

        if (rightFoot != null)
        {
            lowest = Mathf.Min(lowest, rightFoot.position.y);
        }

        return float.IsInfinity(lowest) ? float.NaN : lowest;
    }

    private static string SanitizeFileName(string value)
    {
        var invalid = new HashSet<char>(System.IO.Path.GetInvalidFileNameChars());
        var characters = value.Select(character => invalid.Contains(character) ? '_' : character).ToArray();
        return new string(characters);
    }

    private static void EnsureFolder(string assetPath)
    {
        var segments = assetPath.Split('/');
        var current = segments[0];
        for (var i = 1; i < segments.Length; i++)
        {
            var next = current + "/" + segments[i];
            if (!AssetDatabase.IsValidFolder(next))
            {
                AssetDatabase.CreateFolder(current, segments[i]);
            }
            current = next;
        }
    }
}
#endif
