"use client"

import type React from "react"
import { useMemo } from "react"
import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Trash2, Plus, Heart, Zap, User, BarChart3, Download, ArrowRight, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Scatter,
} from "recharts"
import { jsPDF } from "jspdf"

interface Criterion {
  id: string
  name: string
  weight: number
  category: "hot" | "crazy"
}

interface Person {
  id: string
  name: string
  scores: Record<string, number>
  hotScore: number
  crazyScore: number
  zone: string
}

const ZONES = {
  "No Go Zone": {
    x: [0, 5],
    y: [0, 10],
    color: "bg-red-100 text-red-800",
    chartColor: "#fecaca",
    shape: "rectangle",
    description:
      "Avoid investing time here. These individuals may not meet your standards for a meaningful relationship. Focus your energy elsewhere.",
    pattern: <path d="M0,4 L4,0" stroke="#dc2626" strokeWidth="0.5" opacity="0.6" />,
  },
  "Danger Zone": {
    x: [5, 10],
    y: [5, 10],
    color: "bg-orange-100 text-orange-800",
    chartColor: "#fed7aa",
    shape: "triangle",
    description:
      "Proceed with caution. High attraction but potentially unstable. Keep boundaries clear and avoid sharing sensitive information early.",
    pattern: <circle cx="2" cy="2" r="0.5" fill="#ea580c" opacity="0.6" />,
  },
  "Fun Zone": {
    x: [5, 8],
    y: [0, 8],
    color: "bg-yellow-100 text-yellow-800",
    chartColor: "#fef3c7",
    shape: "trapezoid",
    description:
      "Great for exciting experiences but may lack long-term stability. Enjoy the connection while being mindful of emotional boundaries.",
    pattern: (
      <>
        <path d="M0,4 L4,0" stroke="#ca8a04" strokeWidth="0.3" opacity="0.6" />
        <path d="M0,0 L4,4" stroke="#ca8a04" strokeWidth="0.3" opacity="0.6" />
      </>
    ),
  },
  "Date Zone": {
    x: [8, 10],
    y: [5, 10],
    color: "bg-blue-100 text-blue-800",
    chartColor: "#dbeafe",
    shape: "trapezoid",
    description:
      "Good for casual dating and exploring compatibility. Monitor if they develop into more stable zones before committing long-term.",
    pattern: <rect x="1" y="1" width="2" height="2" fill="none" stroke="#2563eb" strokeWidth="0.3" opacity="0.6" />,
  },
  "Wife Zone": {
    x: [8, 10],
    y: [1, 5],
    color: "bg-green-100 text-green-800",
    chartColor: "#dcfce7",
    shape: "rectangle",
    description:
      "Ideal for long-term relationships. High compatibility with good stability. Consider introducing to family and friends when appropriate.",
    pattern: <path d="M2,0 L4,2 L2,4 L0,2 Z" fill="#16a34a" opacity="0.6" />,
  },
  "Chromosome Mismatch": {
    x: [8, 10],
    y: [0, 1],
    color: "bg-purple-100 text-purple-800",
    chartColor: "#e9d5ff",
    shape: "rectangle",
    description:
      "Seems too good to be true - verify authenticity. High attraction with low complexity may indicate incomplete information or misrepresentation.",
    pattern: (
      <>
        <path d="M0,0 L4,4" stroke="#9333ea" strokeWidth="0.4" opacity="0.6" />
        <path d="M0,4 L4,0" stroke="#9333ea" strokeWidth="0.4" opacity="0.6" />
      </>
    ),
  },
}

function getZone(x: number, y: number): string {
  // Process zones in priority order to handle overlapping boundaries

  // Chromosome Mismatch: Rectangle X=8-10, Y=0-1
  if (x >= 8 && x <= 10 && y >= 0 && y <= 1) return "Chromosome Mismatch"

  // Wife Zone: Rectangle X=8-10, Y=1-5
  if (x >= 8 && x <= 10 && y >= 1 && y <= 5) return "Wife Zone"

  // Date Zone: Complex shape in upper right
  if (x >= 8 && x <= 10 && y >= 5 && y <= 10) {
    if (y <= x) return "Date Zone" // Below diagonal line y=x
  }

  // Danger Zone: Triangle - above diagonal line y=x in the 5-10, 5-10 area
  if (x >= 5 && x <= 10 && y >= 5 && y <= 10) {
    if (y >= x) return "Danger Zone" // Above diagonal line y=x
  }

  // Fun Zone: Area between X=5-8, Y=0-8, excluding Danger Zone
  if (x >= 5 && x <= 8 && y >= 0 && y <= 8) {
    if (y < 5 || (y >= 5 && y < x)) return "Fun Zone" // Below Danger Zone
  }

  // No Go Zone: Rectangle X=0-5, Y=0-10 (default for remaining area)
  if (x >= 0 && x <= 5 && y >= 0 && y <= 10) return "No Go Zone"

  return "Unknown Zone"
}

const IntroPage = ({ onNext }: { onNext: () => void }) => (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className="text-center space-y-6">
      <h1 className="text-4xl font-bold text-foreground">Relationship Compatibility Scorer</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Create a personalized scoring system to evaluate relationship compatibility based on "Hot" and "Crazy"
        characteristics.
      </p>
    </div>

    <div className="grid md:grid-cols-3 gap-6">
      <Card className="text-center">
        <CardHeader>
          <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Step 1: Define Hot Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Set up physical traits, behaviors, and characteristics that attract you. Weight each criterion by
            importance.
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardHeader>
          <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Step 2: Define Crazy Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Identify personality traits, behaviors, and red flags that indicate instability or unpredictability.
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardHeader>
          <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Step 3: Score & Analyze</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Rate people on your criteria and visualize results on the Hot vs Crazy matrix with zone classifications.
          </p>
        </CardContent>
      </Card>
    </div>

    <div className="text-center">
      <Button onClick={onNext} size="lg" className="px-8">
        Get Started
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  </div>
)

const TemplateSelectionPage = ({
  onNext,
  onBack,
  onSelectTemplate,
}: {
  onNext: () => void
  onBack: () => void
  onSelectTemplate: (template: any) => void
}) => {
  const templates = [
    {
      name: "Basic Soccer Mom",
      description: "Traditional suburban mom with balanced priorities",
      hotCriteria: [
        { name: "face", weight: 0.25 },
        { name: "body", weight: 0.25 },
        { name: "style", weight: 0.25 },
        { name: "voice", weight: 0.25 },
      ],
      crazyCriteria: [
        { name: "drunk behavior", weight: 0.25 },
        { name: "accountable", weight: 0.75 },
      ],
    },
    {
      name: "Career Woman",
      description: "Professional focused on success and independence",
      hotCriteria: [
        { name: "intelligence", weight: 0.4 },
        { name: "style", weight: 0.3 },
        { name: "confidence", weight: 0.3 },
      ],
      crazyCriteria: [
        { name: "work obsession", weight: 0.4 },
        { name: "control issues", weight: 0.3 },
        { name: "emotional availability", weight: 0.3 },
      ],
    },
    {
      name: "Party Girl",
      description: "Fun-loving social butterfly who enjoys nightlife",
      hotCriteria: [
        { name: "body", weight: 0.35 },
        { name: "energy", weight: 0.25 },
        { name: "social skills", weight: 0.25 },
        { name: "style", weight: 0.15 },
      ],
      crazyCriteria: [
        { name: "impulsiveness", weight: 0.3 },
        { name: "drama creation", weight: 0.25 },
        { name: "substance use", weight: 0.25 },
        { name: "jealousy", weight: 0.2 },
      ],
    },
    {
      name: "Girl Next Door",
      description: "Sweet, approachable, and down-to-earth personality",
      hotCriteria: [
        { name: "personality", weight: 0.4 },
        { name: "natural beauty", weight: 0.3 },
        { name: "kindness", weight: 0.3 },
      ],
      crazyCriteria: [
        { name: "neediness", weight: 0.4 },
        { name: "family drama", weight: 0.35 },
        { name: "passive aggression", weight: 0.25 },
      ],
    },
  ]

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate(template)
    onNext()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Choose a Template</h1>
        <p className="text-lg text-muted-foreground">
          Select a pre-defined template to get started quickly, or skip to create your own criteria from scratch.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {templates.map((template, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">{template.name}</CardTitle>
              <p className="text-muted-foreground">{template.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-primary mb-2">Hot Criteria:</h4>
                <div className="space-y-1">
                  {template.hotCriteria.map((criterion, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="capitalize">{criterion.name}</span>
                      <span className="text-muted-foreground">{(criterion.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-primary mb-2">Crazy Criteria:</h4>
                <div className="space-y-1">
                  {template.crazyCriteria.map((criterion, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="capitalize">{criterion.name}</span>
                      <span className="text-muted-foreground">{(criterion.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={() => handleSelectTemplate(template)} className="w-full mt-4">
                Use This Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="ghost" onClick={onNext}>
          Skip Templates
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

const HotCriteriaPage = ({
  hotCriteria,
  newHotCriterionName,
  hotWeightSum,
  onCriterionChange,
  onKeyPress,
  onAddCriterion,
  onUpdateWeight,
  onRemoveCriterion,
  onNormalizeWeights,
  onBack,
  onNext,
}: {
  hotCriteria: any[]
  newHotCriterionName: string
  hotWeightSum: number
  onCriterionChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onAddCriterion: () => void
  onUpdateWeight: (id: string, weight: number) => void
  onRemoveCriterion: (id: string) => void
  onNormalizeWeights: () => void
  onBack: () => void
  onNext: () => void
}) => (
  <div className="max-w-2xl mx-auto space-y-6">
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Hot Criteria Setup</h1>
      <p className="text-muted-foreground">
        Define the physical traits, behaviors, and attractive characteristics that attract you. Weight them by
        importance.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Hot Criteria
          <Badge variant="secondary" className="ml-auto">
            Weight Sum: {(hotWeightSum * 100).toFixed(1)}%
          </Badge>
        </CardTitle>
        <CardDescription>Physical traits, behaviors, and attractive characteristics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Face, Body, Style, Smile, Voice..."
            value={newHotCriterionName}
            onChange={onCriterionChange}
            onKeyPress={onKeyPress}
          />
          <Button onClick={onAddCriterion} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {hotCriteria.map((criterion) => (
            <div key={criterion.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{criterion.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[criterion.weight * 100]}
                    onValueChange={([value]) => onUpdateWeight(criterion.id, value)}
                    max={100}
                    step={1}
                    className="flex-1 [&_.slider-track]:bg-gray-400 [&_.slider-range]:bg-primary"
                  />
                  <span className="text-sm text-muted-foreground w-12">{(criterion.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemoveCriterion(criterion.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {hotCriteria.length > 0 && (
          <Button
            variant="default"
            onClick={onNormalizeWeights}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white"
          >
            Normalize Hot Weights to 100%
          </Button>
        )}
      </CardContent>
    </Card>

    <div className="flex justify-between">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Templates
      </Button>
      <Button onClick={onNext} disabled={hotCriteria.length === 0 || Math.abs(hotWeightSum - 1) > 0.01}>
        Continue to Crazy Criteria
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  </div>
)

const CrazyCriteriaPage = ({
  crazyCriteria,
  newCrazyCriterionName,
  crazyWeightSum,
  onCriterionChange,
  onKeyPress,
  onAddCriterion,
  onUpdateWeight,
  onRemoveCriterion,
  onNormalizeWeights,
  onBack,
  onNext,
}: {
  crazyCriteria: any[]
  newCrazyCriterionName: string
  crazyWeightSum: number
  onCriterionChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onAddCriterion: () => void
  onUpdateWeight: (id: string, weight: number) => void
  onRemoveCriterion: (id: string) => void
  onNormalizeWeights: () => void
  onBack: () => void
  onNext: () => void
}) => (
  <div className="max-w-2xl mx-auto space-y-6">
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Crazy Criteria Setup</h1>
      <p className="text-muted-foreground">
        Define emotional and behavioral characteristics that matter in relationships. Weight them by significance.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-secondary" />
          Crazy Criteria
          <Badge variant="secondary" className="ml-auto">
            Weight Sum: {(crazyWeightSum * 100).toFixed(1)}%
          </Badge>
        </CardTitle>
        <CardDescription>Emotional stability, behavioral patterns, and personality traits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Career Focus, Respect, Fun, Drama, Independence..."
            value={newCrazyCriterionName}
            onChange={onCriterionChange}
            onKeyPress={onKeyPress}
          />
          <Button onClick={onAddCriterion} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {crazyCriteria.map((criterion) => (
            <div key={criterion.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{criterion.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[criterion.weight * 100]}
                    onValueChange={([value]) => onUpdateWeight(criterion.id, value)}
                    max={100}
                    step={1}
                    className="flex-1 [&_.slider-track]:bg-gray-400 [&_.slider-range]:bg-primary"
                  />
                  <span className="text-sm text-muted-foreground w-12">{(criterion.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemoveCriterion(criterion.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {crazyCriteria.length > 0 && (
          <Button
            variant="default"
            onClick={onNormalizeWeights}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white"
          >
            Normalize Crazy Weights to 100%
          </Button>
        )}
      </CardContent>
    </Card>

    <div className="flex justify-between">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Hot Criteria
      </Button>
      <Button onClick={onNext} disabled={crazyCriteria.length === 0 || Math.abs(crazyWeightSum - 1) > 0.01}>
        Start Scoring People
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  </div>
)

const PeoplePage = ({
  criteria,
  people,
  newPersonName,
  onPersonNameChange,
  onKeyPress,
  onAddPerson,
  onRemovePerson,
  onUpdatePersonScore,
  onUpdateCriterionWeight,
  onBack,
  onNext,
}: {
  criteria: any[]
  people: any[]
  newPersonName: string
  onPersonNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onAddPerson: () => void
  onRemovePerson: (id: string) => void
  onUpdatePersonScore: (personId: string, criterionId: string, score: number) => void
  onUpdateCriterionWeight: (criterionId: string, weight: number) => void
  onBack: () => void
  onNext: () => void
}) => (
  <div className="max-w-6xl mx-auto space-y-6">
    {criteria.length === 0 ? (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <User className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No Criteria Set Up</h3>
            <p className="text-muted-foreground">You need to set up your criteria first before you can score people.</p>
            <Button onClick={onBack}>Set Up Criteria</Button>
          </div>
        </CardContent>
      </Card>
    ) : (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Add Person to Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter person's name..."
                value={newPersonName}
                onChange={onPersonNameChange}
                onKeyPress={onKeyPress}
                className="border-2 border-gray-300 focus:border-primary"
              />
              <Button onClick={onAddPerson}>
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </div>
          </CardContent>
        </Card>

        {people.length > 0 && (
          <div className="space-y-6">
            {people.map((person) => (
              <Card key={person.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {person.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onRemovePerson(person.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-primary flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Hot Criteria
                      </h4>
                      {criteria
                        .filter((c) => c.category === "hot")
                        .map((criterion) => (
                          <div key={criterion.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{criterion.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Weight: {(criterion.weight * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Slider
                              value={[person.scores[criterion.id] || 0.1]}
                              onValueChange={([value]) => onUpdatePersonScore(person.id, criterion.id, value)}
                              min={0.1}
                              max={10}
                              step={0.1}
                              className="[&_.slider-track]:bg-gray-400 [&_.slider-range]:bg-primary"
                            />
                            <div className="text-xs text-muted-foreground text-center">
                              Score: {(person.scores[criterion.id] || 0.1).toFixed(1)}
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-secondary flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Crazy Criteria
                      </h4>
                      {criteria
                        .filter((c) => c.category === "crazy")
                        .map((criterion) => (
                          <div key={criterion.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{criterion.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Weight: {(criterion.weight * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Slider
                              value={[person.scores[criterion.id] || 0.1]}
                              onValueChange={([value]) => onUpdatePersonScore(person.id, criterion.id, value)}
                              min={0.1}
                              max={10}
                              step={0.1}
                              className="[&_.slider-track]:bg-gray-400 [&_.slider-range]:bg-primary"
                            />
                            <div className="text-xs text-muted-foreground text-center">
                              Score: {(person.scores[criterion.id] || 0.1).toFixed(1)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Criteria
          </Button>
          <Button onClick={onNext} disabled={people.length === 0}>
            View Results
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </>
    )}
  </div>
)

const ResultsPage = ({
  people,
  onBack,
  exportToPDF,
}: {
  people: any[]
  onBack: () => void
  exportToPDF: () => void
}) => {
  const [isChartExpanded, setIsChartExpanded] = useState(false)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {people.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">No People Scored Yet</h3>
              <p className="text-muted-foreground">
                Add and score some people to see them plotted on the Hot vs Crazy matrix.
              </p>
              <Button onClick={onBack}>Start Scoring People</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Compatibility Results</h2>
                <p className="text-muted-foreground">Analysis of {people.length} scored individuals</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={onBack} variant="outline" className="flex items-center gap-2 bg-transparent">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Scoring
                </Button>
                <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export PDF Report
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Hot vs Crazy Matrix
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsChartExpanded(!isChartExpanded)}
                    className="ml-auto"
                  >
                    {isChartExpanded ? "Collapse" : "Expand"}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Interactive visualization showing where each person falls on the compatibility matrix
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6 overflow-hidden">
                <div
                  className={`w-full transition-all duration-300 cursor-pointer overflow-hidden ${
                    isChartExpanded ? "h-96" : "h-48"
                  }`}
                  onClick={() => setIsChartExpanded(!isChartExpanded)}
                >
                  <ResponsiveContainer width="100%" height="100%" maxHeight={isChartExpanded ? 384 : 192}>
                    <ScatterChart data={people} margin={{ top: 20, right: 30, bottom: 80, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        dataKey="hotScore"
                        domain={[0, 10]}
                        ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                        label={{ value: "Hot Score", position: "insideBottom", offset: -10 }}
                        stroke="#374151"
                      />
                      <YAxis
                        type="number"
                        dataKey="crazyScore"
                        domain={[0, 10]}
                        ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                        label={{ value: "Crazy Score", angle: -90, position: "insideLeft" }}
                        stroke="#374151"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-3 border rounded shadow-lg">
                                <p className="font-semibold">{data.name}</p>
                                <p>Hot Score: {data.hotScore.toFixed(1)}</p>
                                <p>Crazy Score: {data.crazyScore.toFixed(1)}</p>
                                <p>Zone: {data.zone}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />

                      <defs>
                        <pattern id="noGoPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                          <rect width="8" height="8" fill={ZONES["No Go Zone"].chartColor} fillOpacity={0.3} />
                          <path d="M0,8 L8,0" stroke="#dc2626" strokeWidth="1" opacity="0.5" />
                        </pattern>

                        <pattern id="dangerPattern" patternUnits="userSpaceOnUse" width="6" height="6">
                          <rect width="6" height="6" fill={ZONES["Danger Zone"].chartColor} fillOpacity={0.3} />
                          <circle cx="3" cy="3" r="1" fill="#ea580c" opacity="0.6" />
                        </pattern>

                        <pattern id="funPattern" patternUnits="userSpaceOnUse" width="10" height="10">
                          <rect width="10" height="10" fill={ZONES["Fun Zone"].chartColor} fillOpacity={0.3} />
                          <path d="M0,0 L10,10 M0,10 L10,0" stroke="#d97706" strokeWidth="1" opacity="0.4" />
                        </pattern>

                        <pattern id="datePattern" patternUnits="userSpaceOnUse" width="8" height="8">
                          <rect width="8" height="8" fill={ZONES["Date Zone"].chartColor} fillOpacity={0.3} />
                          <rect x="2" y="2" width="4" height="4" fill="#2563eb" opacity="0.3" />
                        </pattern>

                        <pattern id="wifePattern" patternUnits="userSpaceOnUse" width="12" height="12">
                          <rect width="12" height="12" fill={ZONES["Wife Zone"].chartColor} fillOpacity={0.3} />
                          <path d="M0,6 L6,0 L12,6 L6,12 Z" fill="#16a34a" opacity="0.4" />
                        </pattern>

                        <pattern id="chromosomePattern" patternUnits="userSpaceOnUse" width="8" height="8">
                          <rect width="8" height="8" fill={ZONES["Chromosome Mismatch"].chartColor} fillOpacity={0.3} />
                          <path d="M2,2 L6,6 M6,2 L2,6" stroke="#9333ea" strokeWidth="2" opacity="0.6" />
                        </pattern>

                        <clipPath id="dangerZoneClip">
                          <polygon points="5,5 5,10 10,10" />
                        </clipPath>

                        <clipPath id="funZoneClip">
                          <polygon points="5,0 8,0 8,8 5,5" />
                        </clipPath>

                        <clipPath id="dateZoneClip">
                          <polygon points="8,5 10,5 10,10 8,10" />
                        </clipPath>
                      </defs>

                      <ReferenceArea
                        x1={0}
                        x2={5}
                        y1={0}
                        y2={10}
                        fill="url(#noGoPattern)"
                        stroke="#dc2626"
                        strokeWidth={2}
                      />

                      <ReferenceArea
                        x1={5}
                        x2={10}
                        y1={5}
                        y2={10}
                        fill="url(#dangerPattern)"
                        clipPath="url(#dangerZoneClip)"
                        stroke="#ea580c"
                        strokeWidth={2}
                      />

                      <ReferenceArea
                        x1={5}
                        x2={8}
                        y1={0}
                        y2={8}
                        fill="url(#funPattern)"
                        clipPath="url(#funZoneClip)"
                        stroke="#d97706"
                        strokeWidth={2}
                      />

                      <ReferenceArea
                        x1={8}
                        x2={10}
                        y1={5}
                        y2={10}
                        fill="url(#datePattern)"
                        clipPath="url(#dateZoneClip)"
                        stroke="#2563eb"
                        strokeWidth={2}
                      />

                      <ReferenceArea
                        x1={8}
                        x2={10}
                        y1={1}
                        y2={5}
                        fill="url(#wifePattern)"
                        stroke="#16a34a"
                        strokeWidth={2}
                      />
                      <ReferenceArea
                        x1={8}
                        x2={10}
                        y1={0}
                        y2={1}
                        fill="url(#chromosomePattern)"
                        stroke="#9333ea"
                        strokeWidth={2}
                      />
                      <Scatter data={people} fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                {!isChartExpanded && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Click chart or expand button to view larger
                  </p>
                )}

                {/* Zone Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {Object.entries(ZONES).map(([zoneName, zone]) => (
                    <div key={zoneName} className="relative group">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <svg width="24" height="24" className="border border-gray-300">
                          <defs>
                            <pattern
                              id={`legend-${zoneName.replace(/\s+/g, "")}`}
                              patternUnits="userSpaceOnUse"
                              width="4"
                              height="4"
                            >
                              {zone.pattern}
                            </pattern>
                          </defs>
                          <rect width="24" height="24" fill={zone.chartColor} />
                          <rect width="24" height="24" fill={`url(#legend-${zoneName.replace(/\s+/g, "")})`} />
                        </svg>
                        <span className="text-sm font-medium">{zoneName}</span>
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {zone.description}
                      </div>
                    </div>
                  ))}
                </div>

                {people.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-center">Individual Summary</h3>
                    <div className="grid gap-3">
                      {people.map((person) => (
                        <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{person.name}</span>
                            <span className="text-sm text-gray-600">
                              Hot: {person.hotScore.toFixed(1)}, Crazy: {person.crazyScore.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg width="16" height="16" className="border border-gray-300">
                              <defs>
                                <pattern
                                  id={`summary-${person.zone.replace(/\s+/g, "")}`}
                                  patternUnits="userSpaceOnUse"
                                  width="4"
                                  height="4"
                                >
                                  {ZONES[person.zone]?.pattern}
                                </pattern>
                              </defs>
                              <rect width="16" height="16" fill={ZONES[person.zone]?.chartColor || "#e5e7eb"} />
                              <rect width="16" height="16" fill={`url(#summary-${person.zone.replace(/\s+/g, "")})`} />
                            </svg>
                            <span className="text-sm font-medium">{person.zone}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default function RelationshipScorer() {
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [newHotCriterionName, setNewHotCriterionName] = useState("")
  const [newCrazyCriterionName, setNewCrazyCriterionName] = useState("")
  const [newPersonName, setNewPersonName] = useState("")
  const [currentPage, setCurrentPage] = useState("intro")

  const hotCriteria = useMemo(() => criteria.filter((c) => c.category === "hot"), [criteria])
  const crazyCriteria = useMemo(() => criteria.filter((c) => c.category === "crazy"), [criteria])
  const hotWeightSum = useMemo(() => hotCriteria.reduce((sum, c) => sum + c.weight, 0), [hotCriteria])
  const crazyWeightSum = useMemo(() => crazyCriteria.reduce((sum, c) => sum + c.weight, 0), [crazyCriteria])

  const addCriterion = (category: "hot" | "crazy", name: string) => {
    if (!name.trim()) return

    const newCriterion: Criterion = {
      id: Date.now().toString(),
      name: name.trim(),
      weight: 0.1,
      category: category,
    }

    const updatedCriteria = [...criteria, newCriterion]

    const categoryCriteria = updatedCriteria.filter((c) => c.category === category)
    const equalWeight = 1 / categoryCriteria.length

    const normalizedCriteria = updatedCriteria.map((c) => (c.category === category ? { ...c, weight: equalWeight } : c))

    setCriteria(normalizedCriteria)

    if (category === "hot") {
      setNewHotCriterionName("")
    } else {
      setNewCrazyCriterionName("")
    }
  }

  const removeCriterion = (id: string) => {
    setCriteria(criteria.filter((c) => c.id !== id))
  }

  const updateWeight = (id: string, weight: number) => {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, weight: weight / 100 } : c)))
  }

  const normalizeWeights = (category: "hot" | "crazy") => {
    const categoryCriteria = criteria.filter((c) => c.category === category)
    const totalWeight = categoryCriteria.reduce((sum, c) => sum + c.weight, 0)

    if (totalWeight === 0) return

    setCriteria(criteria.map((c) => (c.category === category ? { ...c, weight: c.weight / totalWeight } : c)))
  }

  const addPerson = () => {
    if (!newPersonName.trim()) return

    const newPerson: Person = {
      id: Date.now().toString(),
      name: newPersonName.trim(),
      scores: {},
      hotScore: 0,
      crazyScore: 0,
      zone: "Unknown Zone",
    }

    setPeople([...people, newPerson])
    setNewPersonName("")
  }

  const removePerson = (id: string) => {
    setPeople(people.filter((p) => p.id !== id))
  }

  const updatePersonScore = (personId: string, criterionId: string, score: number) => {
    setPeople(
      people.map((person) => {
        if (person.id === personId) {
          const updatedScores = { ...person.scores, [criterionId]: score }
          const hotScore = calculateCategoryScore(updatedScores, "hot")
          const crazyScore = calculateCategoryScore(updatedScores, "crazy")
          const zone = getZone(hotScore, crazyScore)

          return {
            ...person,
            scores: updatedScores,
            hotScore,
            crazyScore,
            zone,
          }
        }
        return person
      }),
    )
  }

  const calculateCategoryScore = (scores: Record<string, number>, category: "hot" | "crazy"): number => {
    const categoryCriteria = criteria.filter((c) => c.category === category)
    const totalWeight = categoryCriteria.reduce((sum, c) => sum + c.weight, 0)

    if (totalWeight === 0) return 0

    const weightedSum = categoryCriteria.reduce((sum, criterion) => {
      const score = scores[criterion.id] || 0
      return sum + score * criterion.weight
    }, 0)

    return weightedSum / totalWeight
  }

  const exportToPDF = async () => {
    const doc = new jsPDF()

    const chartElement = document.querySelector(".recharts-wrapper svg") as SVGElement
    let chartImageData = null

    if (chartElement) {
      try {
        const svgClone = chartElement.cloneNode(true) as SVGElement

        const allElements = svgClone.querySelectorAll("*")
        allElements.forEach((element) => {
          const computedStyle = window.getComputedStyle(element as Element)

          if (computedStyle.fill && computedStyle.fill !== "none") {
            ;(element as any).setAttribute("fill", computedStyle.fill)
          }
          if (computedStyle.stroke && computedStyle.stroke !== "none") {
            ;(element as any).setAttribute("stroke", computedStyle.stroke)
          }
        })

        svgClone.setAttribute("width", "800")
        svgClone.setAttribute("height", "600")

        const svgData = new XMLSerializer().serializeToString(svgClone)
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const img = new Image()

        canvas.width = 800
        canvas.height = 600

        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const url = URL.createObjectURL(svgBlob)

        await new Promise((resolve, reject) => {
          img.onload = () => {
            ctx?.drawImage(img, 0, 0)
            chartImageData = canvas.toDataURL("image/png")
            URL.revokeObjectURL(url)
            resolve(true)
          }
          img.onerror = (error) => {
            URL.revokeObjectURL(url)
            reject(error)
          }
          img.src = url
        })
      } catch (error) {}
    }

    doc.setFontSize(20)
    doc.text("Relationship Compatibility Report", 20, 20)

    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30)

    let yPosition = 50

    if (chartImageData) {
      doc.setFontSize(14)
      doc.text("Hot vs Crazy Matrix Chart", 20, yPosition)
      yPosition += 10

      doc.addImage(chartImageData, "PNG", 20, yPosition, 160, 120)
      yPosition += 130
    }

    doc.setFontSize(14)
    doc.text("Criteria Summary", 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.text(`Hot Criteria (${hotCriteria.length} items):`, 20, yPosition)
    yPosition += 5

    hotCriteria.forEach((criterion) => {
      doc.text(`• ${criterion.name}: ${(criterion.weight * 100).toFixed(1)}%`, 25, yPosition)
      yPosition += 5
    })

    yPosition += 5
    doc.text(`Crazy Criteria (${crazyCriteria.length} items):`, 20, yPosition)
    yPosition += 5

    crazyCriteria.forEach((criterion) => {
      doc.text(`• ${criterion.name}: ${(criterion.weight * 100).toFixed(1)}%`, 25, yPosition)
      yPosition += 5
    })

    yPosition += 10
    doc.setFontSize(14)
    doc.text("Scored Individuals", 20, yPosition)
    yPosition += 10

    people.forEach((person) => {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(12)
      doc.text(`${person.name}`, 20, yPosition)
      yPosition += 5

      doc.setFontSize(10)
      doc.text(`Hot Score: ${person.hotScore.toFixed(1)} | Crazy Score: ${person.crazyScore.toFixed(1)}`, 25, yPosition)
      yPosition += 5
      doc.text(`Zone: ${person.zone}`, 25, yPosition)
      yPosition += 5
      doc.text(`Coordinates: (${person.hotScore.toFixed(1)}, ${person.crazyScore.toFixed(1)})`, 25, yPosition)
      yPosition += 10
    })

    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    yPosition += 10
    doc.setFontSize(14)
    doc.text("Zone Descriptions", 20, yPosition)
    yPosition += 10

    Object.entries(ZONES).forEach(([zone, zoneData]) => {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(11)
      doc.text(`${zone}:`, 20, yPosition)
      yPosition += 5

      doc.setFontSize(9)
      const lines = doc.splitTextToSize(zoneData.description, 170)
      doc.text(lines, 25, yPosition)
      yPosition += lines.length * 4 + 5
    })

    doc.save("relationship-compatibility-report.pdf")
  }

  const handleHotCriterionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewHotCriterionName(e.target.value)
  }, [])

  const handleCrazyCriterionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCrazyCriterionName(e.target.value)
  }, [])

  const handleAddHotCriterion = useCallback(() => {
    addCriterion("hot", newHotCriterionName)
  }, [newHotCriterionName])

  const handleAddCrazyCriterion = useCallback(() => {
    addCriterion("crazy", newCrazyCriterionName)
  }, [newCrazyCriterionName])

  const handleHotKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        addCriterion("hot", newHotCriterionName)
      }
    },
    [newHotCriterionName],
  )

  const handleCrazyKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        addCriterion("crazy", newCrazyCriterionName)
      }
    },
    [newCrazyCriterionName],
  )

  const handlePersonNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPersonName(e.target.value)
  }, [])

  const handlePersonKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addPerson()
    }
  }, [])

  const handleBackToIntro = useCallback(() => {
    setCurrentPage("intro")
  }, [])

  const handleBackToHotCriteria = useCallback(() => {
    setCurrentPage("hot-criteria")
  }, [])

  const handleBackToCrazyCriteria = useCallback(() => {
    setCurrentPage("crazy-criteria")
  }, [])

  const handleBackToPeople = useCallback(() => {
    setCurrentPage("people")
  }, [])

  const handleNextToHotCriteria = useCallback(() => {
    setCurrentPage("hot-criteria")
  }, [])

  const handleNextToCrazyCriteria = useCallback(() => {
    setCurrentPage("crazy-criteria")
  }, [])

  const handleNextToPeople = useCallback(() => {
    setCurrentPage("people")
  }, [])

  const handleNextToResults = useCallback(() => {
    setCurrentPage("results")
  }, [])

  const handleNextToTemplates = useCallback(() => {
    setCurrentPage("templates")
  }, [])

  const handleNextToHotCriteriaFromTemplates = useCallback(() => {
    setCurrentPage("hot-criteria")
  }, [])

  const handleBackToTemplates = useCallback(() => {
    setCurrentPage("templates")
  }, [])

  const loadTemplate = useCallback((template: any) => {
    // Clear existing criteria
    setCriteria([])

    // Add hot criteria from template
    const hotCriteria = template.hotCriteria.map((criterion: any) => ({
      id: Date.now() + Math.random(),
      name: criterion.name,
      category: "hot" as const,
      weight: criterion.weight,
    }))

    // Add crazy criteria from template
    const crazyCriteria = template.crazyCriteria.map((criterion: any) => ({
      id: Date.now() + Math.random(),
      name: criterion.name,
      category: "crazy" as const,
      weight: criterion.weight,
    }))

    setCriteria([...hotCriteria, ...crazyCriteria])
  }, [])

  const handleUpdateCriterionWeight = useCallback((criterionId: string, weight: number) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === criterionId ? { ...c, weight: Math.max(0.01, Math.min(1, weight)) } : c)),
    )
  }, [])

  return (
    <div className="min-h-screen bg-background p-4">
      {currentPage === "intro" && <IntroPage onNext={handleNextToTemplates} />}
      {currentPage === "templates" && (
        <TemplateSelectionPage
          onNext={handleNextToHotCriteriaFromTemplates}
          onBack={handleBackToIntro}
          onSelectTemplate={loadTemplate}
        />
      )}
      {currentPage === "hot-criteria" && (
        <HotCriteriaPage
          hotCriteria={hotCriteria}
          newHotCriterionName={newHotCriterionName}
          hotWeightSum={hotWeightSum}
          onCriterionChange={handleHotCriterionChange}
          onKeyPress={handleHotKeyPress}
          onAddCriterion={handleAddHotCriterion}
          onUpdateWeight={updateWeight}
          onRemoveCriterion={removeCriterion}
          onNormalizeWeights={() => normalizeWeights("hot")}
          onBack={handleBackToTemplates}
          onNext={handleNextToCrazyCriteria}
        />
      )}
      {currentPage === "crazy-criteria" && (
        <CrazyCriteriaPage
          crazyCriteria={crazyCriteria}
          newCrazyCriterionName={newCrazyCriterionName}
          crazyWeightSum={crazyWeightSum}
          onCriterionChange={handleCrazyCriterionChange}
          onKeyPress={handleCrazyKeyPress}
          onAddCriterion={handleAddCrazyCriterion}
          onUpdateWeight={updateWeight}
          onRemoveCriterion={removeCriterion}
          onNormalizeWeights={() => normalizeWeights("crazy")}
          onBack={handleBackToHotCriteria}
          onNext={handleNextToPeople}
        />
      )}
      {currentPage === "people" && (
        <PeoplePage
          criteria={criteria}
          people={people}
          newPersonName={newPersonName}
          onPersonNameChange={handlePersonNameChange}
          onKeyPress={handlePersonKeyPress}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
          onUpdatePersonScore={updatePersonScore}
          onUpdateCriterionWeight={handleUpdateCriterionWeight}
          onBack={handleBackToCrazyCriteria}
          onNext={handleNextToResults}
        />
      )}
      {currentPage === "results" && (
        <ResultsPage people={people} onBack={handleBackToPeople} exportToPDF={exportToPDF} />
      )}
    </div>
  )
}
