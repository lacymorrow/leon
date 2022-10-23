import fs from 'node:fs'
import path from 'node:path'

import type { ShortLanguageCode } from '@/helpers/lang-helper'

enum SkillBridges {
  Python = 'python'
}

interface Skill {
  name: string
  path: string
  bridge: `${SkillBridges}`
}

interface SkillDomain {
  name: string
  path: string
  skills: {
    [key: string]: Skill
  }
}

const DOMAINS_DIR = path.join(process.cwd(), 'skills')

export class SkillDomainHelper {
  /**
   * List all skills domains with skills data inside
   */
  public static async getSkillDomains(): Promise<Map<string, SkillDomain>> {
    const skillDomains = new Map<string, SkillDomain>()

    await Promise.all(
      (
        await fs.promises.readdir(DOMAINS_DIR)
      ).map(async (entity) => {
        const domainPath = path.join(DOMAINS_DIR, entity)

        if ((await fs.promises.stat(domainPath)).isDirectory()) {
          const skills: SkillDomain['skills'] = {}
          const { name: domainName } = (await import(
            path.join(domainPath, 'domain.json')
          )) as SkillDomain
          const skillFolders = await fs.promises.readdir(domainPath)

          for (let i = 0; i < skillFolders.length; i += 1) {
            const skillAliasName = skillFolders[i] as string
            const skillPath = path.join(domainPath, skillAliasName)

            if ((await fs.promises.stat(skillPath)).isDirectory()) {
              const { name: skillName, bridge: skillBridge } = JSON.parse(
                await fs.promises.readFile(
                  path.join(skillPath, 'skill.json'),
                  'utf8'
                )
              ) as Skill

              skills[skillName] = {
                name: skillAliasName,
                path: skillPath,
                bridge: skillBridge
              }
            }

            const skillDomain: SkillDomain = {
              name: entity,
              path: domainPath,
              skills
            }
            skillDomains.set(domainName, skillDomain)
          }
        }

        return null
      })
    )

    return skillDomains
  }

  /**
   * Get information of a specific domain
   * @param domain Domain to get info from
   */
  public static async getSkillDomainInfo(
    domain: SkillDomain['name']
  ): Promise<unknown> {
    return JSON.parse(
      await fs.promises.readFile(
        path.join(DOMAINS_DIR, domain, 'domain.json'),
        'utf8'
      )
    )
  }

  /**
   * Get information of a specific skill
   * @param domain Domain where the skill belongs
   * @param skill Skill to get info from
   */
  public static async getSkillInfo(
    domain: SkillDomain['name'],
    skill: Skill['name']
  ): Promise<unknown> {
    return JSON.parse(
      await fs.promises.readFile(
        path.join(DOMAINS_DIR, domain, skill, 'skill.json'),
        'utf8'
      )
    )
  }

  /**
   * Get skill config
   * @param configFilePath Path of the skill config file
   * @param lang Language short code
   */
  public static async getSkillConfig(
    configFilePath: string,
    lang: ShortLanguageCode
  ): Promise<unknown> {
    const sharedDataPath = path.join(process.cwd(), 'core/data', lang)
    const configData = JSON.parse(
      await fs.promises.readFile(configFilePath, 'utf8')
    )
    const { entities } = configData

    // Load shared data entities if entity = 'xxx.json'
    if (entities) {
      const entitiesKeys = Object.keys(entities)

      entitiesKeys.forEach(async (entity) => {
        if (typeof entities[entity] === 'string') {
          entities[entity] = JSON.parse(
            await fs.promises.readFile(
              path.join(sharedDataPath, entities[entity]),
              'utf8'
            )
          )
        }
      })

      configData.entities = entities
    }

    return configData
  }
}
